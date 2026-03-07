import { useState, useEffect, useCallback, useRef } from "react";
import { lazyAuth, lazyGoogleProvider } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  getPosts, getArticles, getGuides, getNews,
  savePost, saveArticle, saveGuide, saveNews,
  deletePost, deleteArticle, deleteGuide, deleteNewsItem,
  getPipelineReviews, savePipelineReview, deletePipelineReview,
  getSubscriptions, saveSubscription,
  uploadImage,
} from "./firestore.js";
import { marked } from "marked";
import DOMPurify from "dompurify";
import './styles/admin.css';

// ── Allowed admin emails ─────────────────────────────────────
const ADMIN_EMAILS = [
  "ccdmndkut2@gmail.com",
  "ccdmndkut@gmail.com",
];

function isAdmin(user) {
  return user && ADMIN_EMAILS.includes(user.email);
}

function isPermissionError(error) {
  return error?.code === "permission-denied" || /insufficient permissions/i.test(error?.message || "");
}

function formatAdminError(error, user, action = "complete this action") {
  if (isPermissionError(error)) {
    const email = user?.email || "your signed-in account";
    return `Firebase denied the write for ${email}. This admin UI is working, but your Firestore or Storage security rules do not allow this account to ${action}. Update the Firebase rules for the vaclaims-194006 project to allow the admin user to write posts, guides, news, pipelineReviews, researchPackets, subscriptions, usageMeters, and uploaded images.`;
  }
  return error?.message || `Failed to ${action}.`;
}

function mergeArticleSets(...sets) {
  const merged = new Map();
  for (const set of sets) {
    for (const item of set) {
      const key = String(item.id ?? item._id);
      if (!merged.has(key)) merged.set(key, item);
    }
  }
  return [...merged.values()];
}

function resolveArticleCollection(item) {
  return item?._collection === "articles" ? "articles" : "posts";
}

function mergeItemsById(...sets) {
  const merged = new Map();
  for (const set of sets) {
    for (const item of set) {
      const key = String(item?.id ?? item?._id ?? "");
      if (!key) continue;
      if (!merged.has(key)) merged.set(key, item);
    }
  }
  return [...merged.values()];
}

async function loadStaticAdminContent() {
  const [postsRes, guidesRes, newsRes] = await Promise.all([
    fetch("/posts.json"),
    fetch("/guides.json"),
    fetch("/news.json"),
  ]);

  if (!postsRes.ok || !guidesRes.ok || !newsRes.ok) {
    throw new Error("Static admin content could not be loaded.");
  }

  const [postsData, guidesData, newsData] = await Promise.all([
    postsRes.json(),
    guidesRes.json(),
    newsRes.json(),
  ]);

  return {
    posts: (postsData || []).map((item) => ({ ...item, _collection: "posts" })),
    guides: (guidesData || []).map((item) => ({ ...item, _collection: "guides" })),
    news: (newsData || []).map((item) => ({ ...item, _collection: "news" })),
  };
}

async function loadReviewQueue() {
  const response = await fetch("/review-queue.json", { cache: "no-store" });
  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error("Pipeline review queue could not be loaded.");
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function mapPipelineReviews(items) {
  const mapped = {};
  for (const item of items || []) {
    const key = String(item?._id ?? item?.id ?? "");
    if (!key) continue;
    mapped[key] = item;
  }
  return mapped;
}

function getPipelineStatusMeta(status) {
  if (status === "approved") return { label: "Approved", background: "#1a4d35", color: "#9ce4b7" };
  if (status === "published") return { label: "Published", background: "#1f4b45", color: "#9ce4da" };
  if (status === "needs_revision") return { label: "Needs Revision", background: "#4a3312", color: "#f3ce8d" };
  if (status === "rejected") return { label: "Rejected", background: "#4a1820", color: "#ffb4b4" };
  return { label: "Pending Review", background: "#1a3a5c", color: "#c9a84c" };
}

function formatReadTime(readTime) {
  if (readTime == null || readTime === "") return "";
  return typeof readTime === "number" ? `${readTime} min` : String(readTime);
}

// Safe HTML rendering helper - all user content sanitized via DOMPurify
function SafeHTML({ html }) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}

// ── Styles ───────────────────────────────────────────────────
const S = {
  page: { fontFamily: "'Inter', system-ui, sans-serif", background: "#0b1a2e", color: "#e8e0d0", minHeight: "100vh", padding: "0" },
  header: { background: "#0d2240", borderBottom: "1px solid #1a3a5c", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: "#c9a84c" },
  btn: { padding: "8px 16px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all 0.2s" },
  btnGold: { background: "#c9a84c", color: "#0b1a2e" },
  btnDanger: { background: "#dc3545", color: "#fff" },
  btnOutline: { background: "transparent", border: "1px solid #1a3a5c", color: "#8aa3c8" },
  card: { background: "#0d2240", border: "1px solid #1a3a5c", borderRadius: 8, padding: 20, marginBottom: 12 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 4, border: "1px solid #1a3a5c", background: "#091729", color: "#e8e0d0", fontSize: 14, fontFamily: "'Inter', sans-serif", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 12px", borderRadius: 4, border: "1px solid #1a3a5c", background: "#091729", color: "#e8e0d0", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", minHeight: 300, resize: "vertical", boxSizing: "border-box" },
  label: { display: "block", fontSize: 11, fontWeight: 600, color: "#8aa3c8", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 },
  tabs: { display: "flex", gap: 0, borderBottom: "1px solid #1a3a5c", marginBottom: 24 },
  tab: { padding: "12px 24px", cursor: "pointer", fontSize: 13, fontWeight: 600, borderBottom: "2px solid transparent", color: "#8aa3c8", transition: "all 0.2s" },
  tabActive: { borderBottomColor: "#c9a84c", color: "#c9a84c" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  badge: { display: "inline-block", padding: "2px 8px", borderRadius: 3, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" },
  preview: { background: "#faf5eb", color: "#1a1a1a", borderRadius: 8, padding: "24px 32px", maxHeight: 400, overflow: "auto" },
  container: { maxWidth: 1200, margin: "0 auto", padding: "24px 32px" },
};

// ── Login Screen ─────────────────────────────────────────────
function LoginScreen() {
  const [error, setError] = useState("");
  const login = async () => {
    try {
      const result = await signInWithPopup(lazyAuth(), lazyGoogleProvider());
      if (!isAdmin(result.user)) {
        await signOut(lazyAuth());
        setError("Not authorized. Admin access only.");
      }
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>V2</div>
        <h1 style={{ ...S.title, fontSize: 28, marginBottom: 8 }}>V2V Admin</h1>
        <p style={{ color: "#8aa3c8", marginBottom: 24 }}>Content management for Veteran 2 Veteran</p>
        <button onClick={login} style={{ ...S.btn, ...S.btnGold, fontSize: 15, padding: "12px 32px" }}>
          Sign in with Google
        </button>
        {error && <p style={{ color: "#dc3545", marginTop: 12, fontSize: 13 }}>{error}</p>}
      </div>
    </div>
  );
}

// ── Image Upload ─────────────────────────────────────────────
function ImageUpload({ label, currentUrl, onUpload, storagePath, user }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(storagePath || `images/${file.name}`, file);
      onUpload(url);
    } catch (err) {
      console.error("Upload failed:", err);
      setError(formatAdminError(err, user, "upload images"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label style={S.label}>{label}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        <button onClick={() => fileRef.current?.click()} style={{ ...S.btn, ...S.btnOutline }} disabled={uploading}>
          {uploading ? "Uploading..." : "Choose Image"}
        </button>
        {currentUrl && (
          <img src={currentUrl} alt="preview" style={{ height: 40, borderRadius: 4, border: "1px solid #1a3a5c" }} />
        )}
      </div>
      {error && <div style={{ color: "#ff9a9a", fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>{error}</div>}
    </div>
  );
}

// ── Post Editor ──────────────────────────────────────────────
function PostEditor({ post, onSave, onCancel, user }) {
  const [form, setForm] = useState({
    id: post?.id || post?._id || Date.now(),
    _collection: post?._collection || "posts",
    title: post?.title || "",
    category: post?.category || "",
    section: post?.section || "",
    date: post?.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    excerpt: post?.excerpt || "",
    body: post?.body || "",
    author: post?.author || "Chris Combs",
    readTime: post?.readTime || "5 min",
    featured: post?.featured || false,
    isFeaturedHero: post?.isFeaturedHero || false,
    heroImage: post?.heroImage || "",
    tags: post?.tags || [],
    keyTakeaway: post?.keyTakeaway || "",
    whyItMatters: post?.whyItMatters || "",
    whatThisMeans: post?.whatThisMeans || "",
    sources: post?.sources || [],
    hidden: post?.hidden || false,
    _pipelineId: post?._pipelineId || null,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="admin-editor-header">
        <h2 style={{ fontSize: 18, color: "#c9a84c" }}>{post ? "Edit Post" : "New Post"}</h2>
        <div className="admin-editor-header-actions" style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowPreview(!showPreview)} style={{ ...S.btn, ...S.btnOutline }}>
            {showPreview ? "Editor" : "Preview"}
          </button>
          <button onClick={onCancel} style={{ ...S.btn, ...S.btnOutline }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...S.btn, ...S.btnGold }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {showPreview ? (
        <div style={S.preview}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28 }}>{form.title}</h1>
          <SafeHTML html={marked.parse(form.body || "")} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="admin-grid">
            <div>
              <label style={S.label}>Title</label>
              <input style={S.input} value={form.title} onChange={e => update("title", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Category</label>
              <input style={S.input} value={form.category} onChange={e => update("category", e.target.value)} />
            </div>
          </div>
          <div className="admin-grid">
            <div>
              <label style={S.label}>Editorial Section</label>
              <select style={S.input} value={form.section} onChange={e => update("section", e.target.value)}>
                <option value="">-- Auto from category --</option>
                <option value="va-policy">VA Policy</option>
                <option value="claims-strategy">Claims Strategy</option>
                <option value="cavc">CAVC / Fed Circuit</option>
                <option value="explainers">Explainers</option>
                <option value="opinion">Opinion</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Date</label>
              <input style={S.input} value={form.date} onChange={e => update("date", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Read Time</label>
              <input style={S.input} value={form.readTime} onChange={e => update("readTime", e.target.value)} />
            </div>
          </div>
          <div>
            <label style={S.label}>Excerpt</label>
            <textarea style={{ ...S.input, minHeight: 60 }} value={form.excerpt} onChange={e => update("excerpt", e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Tags (comma-separated)</label>
            <input style={S.input} value={(form.tags || []).join(", ")} onChange={e => update("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))} />
          </div>
          <ImageUpload
            label="Hero Image"
            currentUrl={form.heroImage}
            onUpload={url => update("heroImage", url)}
            storagePath={`images/posts/${form.id}-hero.png`}
            user={user}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8aa3c8", cursor: "pointer" }}>
              <input type="checkbox" checked={form.featured} onChange={e => update("featured", e.target.checked)} />
              Featured
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8aa3c8", cursor: "pointer" }}>
              <input type="checkbox" checked={form.isFeaturedHero} onChange={e => update("isFeaturedHero", e.target.checked)} />
              Homepage Hero
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8aa3c8", cursor: "pointer" }}>
              <input type="checkbox" checked={form.hidden} onChange={e => update("hidden", e.target.checked)} />
              Hidden from public site
            </label>
          </div>
          <div>
            <label style={S.label}>Key Takeaway</label>
            <textarea style={{ ...S.input, minHeight: 60 }} value={form.keyTakeaway} onChange={e => update("keyTakeaway", e.target.value)} placeholder="1-2 sentence key point shown in a callout box on the article" />
          </div>
          <div>
            <label style={S.label}>Why It Matters</label>
            <textarea style={{ ...S.input, minHeight: 60 }} value={form.whyItMatters} onChange={e => update("whyItMatters", e.target.value)} placeholder="Axios-style framing of why this matters" />
          </div>
          <div>
            <label style={S.label}>What This Means for Veterans</label>
            <textarea style={{ ...S.input, minHeight: 60 }} value={form.whatThisMeans} onChange={e => update("whatThisMeans", e.target.value)} placeholder="Practical impact for veterans" />
          </div>
          <div>
            <label style={S.label}>Sources (one URL per line)</label>
            <textarea style={{ ...S.input, minHeight: 60 }} value={(form.sources || []).join("\n")} onChange={e => update("sources", e.target.value.split("\n").map(s => s.trim()).filter(Boolean))} placeholder="https://example.com/source1&#10;https://example.com/source2" />
          </div>
          <div>
            <label style={S.label}>Body (Markdown)</label>
            <textarea style={S.textarea} value={form.body} onChange={e => update("body", e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Guide Editor ─────────────────────────────────────────────
function GuideEditor({ guide, onSave, onCancel, user }) {
  const [form, setForm] = useState({
    id: guide?.id || guide?._id || "",
    icon: guide?.icon || "",
    title: guide?.title || "",
    desc: guide?.desc || "",
    readTime: guide?.readTime || "10 min",
    heroImage: guide?.heroImage || "",
    sections: guide?.sections || [{ heading: "", body: "" }],
  });
  const [saving, setSaving] = useState(false);
  const [previewIdx, setPreviewIdx] = useState(-1);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const updateSection = (i, k, v) => {
    const secs = [...form.sections];
    secs[i] = { ...secs[i], [k]: v };
    update("sections", secs);
  };

  const addSection = () => update("sections", [...form.sections, { heading: "", body: "" }]);

  const removeSection = (i) => {
    if (form.sections.length <= 1) return;
    update("sections", form.sections.filter((_, idx) => idx !== i));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="admin-editor-header">
        <h2 style={{ fontSize: 18, color: "#c9a84c" }}>{guide ? "Edit Guide" : "New Guide"}</h2>
        <div className="admin-editor-header-actions" style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ ...S.btn, ...S.btnOutline }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...S.btn, ...S.btnGold }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="admin-grid">
          <div>
            <label style={S.label}>Guide ID (slug)</label>
            <input style={S.input} value={form.id} onChange={e => update("id", e.target.value)} disabled={!!guide} />
          </div>
          <div>
            <label style={S.label}>Title</label>
            <input style={S.input} value={form.title} onChange={e => update("title", e.target.value)} />
          </div>
        </div>
        <div className="admin-grid">
          <div>
            <label style={S.label}>Icon (emoji)</label>
            <input style={S.input} value={form.icon} onChange={e => update("icon", e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Read Time</label>
            <input style={S.input} value={form.readTime} onChange={e => update("readTime", e.target.value)} />
          </div>
        </div>
        <div>
          <label style={S.label}>Description</label>
          <textarea style={{ ...S.input, minHeight: 60 }} value={form.desc} onChange={e => update("desc", e.target.value)} />
        </div>
        <ImageUpload
          label="Hero Image"
          currentUrl={form.heroImage}
          onUpload={url => update("heroImage", url)}
          storagePath={`images/guides/${form.id}-hero.png`}
          user={user}
        />

        <div style={{ borderTop: "1px solid #1a3a5c", paddingTop: 16, marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <label style={{ ...S.label, margin: 0 }}>Sections ({form.sections.length})</label>
            <button onClick={addSection} style={{ ...S.btn, ...S.btnOutline, fontSize: 11 }}>+ Add Section</button>
          </div>
          {form.sections.map((sec, i) => (
            <div key={i} style={{ ...S.card, position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: "#c9a84c", fontWeight: 700 }}>Section {i + 1}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => setPreviewIdx(previewIdx === i ? -1 : i)} style={{ ...S.btn, ...S.btnOutline, fontSize: 10, padding: "4px 8px" }}>
                    {previewIdx === i ? "Edit" : "Preview"}
                  </button>
                  <button onClick={() => removeSection(i)} style={{ ...S.btn, fontSize: 10, padding: "4px 8px", background: "#2a1520", color: "#dc3545", border: "1px solid #3a2530" }}>
                    Remove
                  </button>
                </div>
              </div>
              {previewIdx === i ? (
                <div style={S.preview}>
                  <h3>{sec.heading}</h3>
                  <SafeHTML html={marked.parse(sec.body || "")} />
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: 8 }}>
                    <label style={S.label}>Heading</label>
                    <input style={S.input} value={sec.heading} onChange={e => updateSection(i, "heading", e.target.value)} />
                  </div>
                  <div>
                    <label style={S.label}>Body (Markdown)</label>
                    <textarea style={{ ...S.textarea, minHeight: 180 }} value={sec.body} onChange={e => updateSection(i, "body", e.target.value)} />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── News Editor ──────────────────────────────────────────────
function NewsEditor({ item, onSave, onCancel, user }) {
  const [form, setForm] = useState({
    id: item?.id || item?._id || `n${String(Date.now()).slice(-3)}`,
    title: item?.title || "",
    category: item?.category || "",
    date: item?.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    timestamp: item?.timestamp || new Date().toISOString(),
    excerpt: item?.excerpt || "",
    body: item?.body || "",
    author: item?.author || "Chris Combs",
    readTime: item?.readTime || "4 min",
    breaking: item?.breaking || false,
    heroImage: item?.heroImage || "",
    tags: item?.tags || [],
    relatedPostId: item?.relatedPostId || null,
    hidden: item?.hidden || false,
    _pipelineId: item?._pipelineId || null,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="admin-editor-header">
        <h2 style={{ fontSize: 18, color: "#c9a84c" }}>{item ? "Edit News" : "New News Item"}</h2>
        <div className="admin-editor-header-actions" style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowPreview(!showPreview)} style={{ ...S.btn, ...S.btnOutline }}>
            {showPreview ? "Editor" : "Preview"}
          </button>
          <button onClick={onCancel} style={{ ...S.btn, ...S.btnOutline }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...S.btn, ...S.btnGold }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {showPreview ? (
        <div style={S.preview}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28 }}>{form.title}</h1>
          <SafeHTML html={marked.parse(form.body || "")} />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={S.label}>Title</label>
            <input style={S.input} value={form.title} onChange={e => update("title", e.target.value)} />
          </div>
          <div className="admin-grid">
            <div>
              <label style={S.label}>Category</label>
              <input style={S.input} value={form.category} onChange={e => update("category", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Date</label>
              <input style={S.input} value={form.date} onChange={e => update("date", e.target.value)} />
            </div>
          </div>
          <div className="admin-grid">
            <div>
              <label style={S.label}>Read Time</label>
              <input style={S.input} value={form.readTime} onChange={e => update("readTime", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Tags (comma-separated)</label>
              <input style={S.input} value={(form.tags || []).join(", ")} onChange={e => update("tags", e.target.value.split(",").map(t => t.trim()).filter(Boolean))} />
            </div>
          </div>
          <div>
            <label style={S.label}>Excerpt</label>
            <textarea style={{ ...S.input, minHeight: 60 }} value={form.excerpt} onChange={e => update("excerpt", e.target.value)} />
          </div>
          <ImageUpload
            label="Hero Image"
            currentUrl={form.heroImage}
            onUpload={url => update("heroImage", url)}
            storagePath={`images/news/${form.id}-hero.png`}
            user={user}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8aa3c8", cursor: "pointer" }}>
              <input type="checkbox" checked={form.breaking} onChange={e => update("breaking", e.target.checked)} />
              Breaking News
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8aa3c8", cursor: "pointer" }}>
              <input type="checkbox" checked={form.hidden} onChange={e => update("hidden", e.target.checked)} />
              Hidden from public site
            </label>
          </div>
          <div>
            <label style={S.label}>Body (Markdown)</label>
            <textarea style={S.textarea} value={form.body} onChange={e => update("body", e.target.value)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Item List ────────────────────────────────────────────────
function ItemList({ items, type, onEdit, onDelete, onCreate }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: "#8aa3c8" }}>{items.length} {type}</span>
        <button onClick={onCreate} style={{ ...S.btn, ...S.btnGold }}>+ New {type.slice(0, -1)}</button>
      </div>
      {items.length === 0 && (
        <div style={{ ...S.card, textAlign: "center", color: "#8aa3c8" }}>
          No {type} yet. Click "New" to create one, or use the Import tab to import from JSON.
        </div>
      )}
      {items.map(item => (
        <div key={item._id || item.id} style={{ ...S.card, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 12, color: "#8aa3c8" }}>
              {item.category && <span style={{ ...S.badge, background: "#1a3a5c", color: "#c9a84c", marginRight: 6 }}>{item.category}</span>}
              {item.date || ""} {item.readTime ? `  ${item.readTime}` : ""}
              {item.breaking && <span style={{ ...S.badge, background: "#dc3545", color: "#fff", marginLeft: 6 }}>BREAKING</span>}
              {item.featured && <span style={{ ...S.badge, background: "#c9a84c", color: "#0b1a2e", marginLeft: 6 }}>FEATURED</span>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <button onClick={() => onEdit(item)} style={{ ...S.btn, ...S.btnOutline, fontSize: 11 }}>Edit</button>
            <button onClick={() => onDelete(item)} style={{ ...S.btn, fontSize: 11, background: "#2a1520", color: "#dc3545", border: "1px solid #3a2530" }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function PipelineReviewPanel({ items, statuses, savingId, onSetStatus, onOpenEditor, onRebuild }) {
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? null);
  const [view, setView] = useState("active");

  const filteredItems = items.filter((item) => {
    const status = statuses[item.id]?.status || null;
    if (view === "rejected") return status === "rejected";
    if (view === "published") return status === "published";
    return status !== "rejected" && status !== "published";
  });

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId(null);
      return;
    }
    if (!filteredItems.some((item) => item.id === selectedId)) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  const selected = filteredItems.find((item) => item.id === selectedId) || filteredItems[0] || null;
  const selectedKey = selected ? String(selected.id) : null;
  const selectedStatusRecord = selected ? statuses[selected.id] : null;
  const selectedStatus = selectedStatusRecord?.status || null;
  const selectedMeta = getPipelineStatusMeta(selectedStatus);
  const scorecard = selected?.scorecard || null;
  const findings = [
    ...(scorecard?.blockItems || []).map((message) => ({ level: "Block", message })),
    ...(scorecard?.flaggedItems || []).map((message) => ({ level: "Flag", message })),
    ...(scorecard?.requiredRevisions || []).map((message) => ({ level: "Revision", message })),
  ];

  return (
    <div>
      <div className="admin-pipeline-grid">
        <div>
          <div style={{ ...S.card, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "#8aa3c8" }}>{filteredItems.length} pipeline drafts</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setView("active")} style={{ ...S.btn, ...(view === "active" ? S.btnGold : S.btnOutline), fontSize: 11 }}>Active</button>
                <button onClick={() => setView("published")} style={{ ...S.btn, ...(view === "published" ? S.btnGold : S.btnOutline), fontSize: 11 }}>Published</button>
                <button onClick={() => setView("rejected")} style={{ ...S.btn, ...(view === "rejected" ? S.btnGold : S.btnOutline), fontSize: 11 }}>Rejected</button>
                {onRebuild && <button onClick={onRebuild} style={{ ...S.btn, ...S.btnOutline, fontSize: 11 }}>Rebuild Queue</button>}
                <button onClick={() => window.location.reload()} style={{ ...S.btn, ...S.btnOutline, fontSize: 11 }}>Refresh</button>
              </div>
            </div>
            {!filteredItems.length && (
              <div style={{ color: "#8aa3c8", fontSize: 13, lineHeight: 1.6 }}>
                No pipeline review items found in this view. Click "Rebuild Queue" after generating drafts.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredItems.map((item) => {
                const statusMeta = getPipelineStatusMeta(statuses[item.id]?.status);
                const isSelected = item.id === selected?.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    style={{
                      ...S.card,
                      textAlign: "left",
                      padding: 14,
                      marginBottom: 0,
                      cursor: "pointer",
                      background: isSelected ? "#132b4a" : "#0d2240",
                      border: isSelected ? "1px solid #c9a84c" : "1px solid #1a3a5c",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4 }}>{item.title}</div>
                      <span style={{ ...S.badge, background: statusMeta.background, color: statusMeta.color, whiteSpace: "nowrap" }}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: "#8aa3c8", lineHeight: 1.5 }}>
                      <span style={{ ...S.badge, background: "#152f4f", color: "#d8c18c", marginRight: 6 }}>{item.kind}</span>
                      {item.category || item.section || "Uncategorized"}
                      {item.scorecard?.overallScore != null ? `  Score ${item.scorecard.overallScore}` : ""}
                      {item.scorecard?.publishReadiness ? `  ${item.scorecard.publishReadiness}` : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          {!selected && (
            <div style={{ ...S.card, color: "#8aa3c8" }}>
              Select a pipeline draft to review.
            </div>
          )}
          {selected && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={S.card}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginBottom: 12, alignItems: "start" }}>
                  <div>
                    <h2 style={{ fontSize: 20, color: "#c9a84c", margin: "0 0 8px" }}>{selected.title}</h2>
                    <div style={{ fontSize: 12, color: "#8aa3c8", lineHeight: 1.6 }}>
                      {selected.date || selected.createdAt}
                      {selected.readTime ? `  ${formatReadTime(selected.readTime)}` : ""}
                      {selected.category ? `  ${selected.category}` : ""}
                      {selected.section ? `  ${selected.section}` : ""}
                    </div>
                  </div>
                  <span style={{ ...S.badge, background: selectedMeta.background, color: selectedMeta.color }}>
                    {selectedMeta.label}
                  </span>
                </div>

                <div className="admin-pipeline-actions">
                  <button disabled={savingId === selectedKey} onClick={() => onSetStatus(selected.id, "approved")} style={{ ...S.btn, ...S.btnGold, opacity: savingId === selectedKey ? 0.7 : 1 }}>Approve</button>
                  <button disabled={savingId === selectedKey} onClick={() => onSetStatus(selected.id, "needs_revision")} style={{ ...S.btn, background: "#5a3e18", color: "#f3d9a1", opacity: savingId === selectedKey ? 0.7 : 1 }}>Needs Revision</button>
                  <button disabled={savingId === selectedKey} onClick={() => onSetStatus(selected.id, "rejected")} style={{ ...S.btn, background: "#4a1820", color: "#ffb4b4", opacity: savingId === selectedKey ? 0.7 : 1 }}>Reject</button>
                  <button disabled={savingId === selectedKey} onClick={() => onSetStatus(selected.id, null)} style={{ ...S.btn, ...S.btnOutline, opacity: savingId === selectedKey ? 0.7 : 1 }}>Clear Status</button>
                  <button onClick={() => onOpenEditor(selected)} style={{ ...S.btn, ...S.btnOutline }}>
                    Open In {selected.kind === "news" ? "News" : "Post"} Editor
                  </button>
                </div>
                {savingId === selectedKey && (
                  <div style={{ fontSize: 12, color: "#8aa3c8", marginBottom: 16 }}>
                    Saving review status...
                  </div>
                )}
                {selectedStatusRecord && (
                  <div style={{ fontSize: 12, color: "#8aa3c8", marginBottom: 16 }}>
                    Reviewed by {selectedStatusRecord.reviewerEmail || "unknown"} {selectedStatusRecord.updatedAt ? `on ${new Date(selectedStatusRecord.updatedAt).toLocaleString()}` : ""}
                  </div>
                )}
                {selectedStatusRecord?.publishedDocId && (
                  <div style={{ fontSize: 12, color: "#8aa3c8", marginBottom: 16 }}>
                    Published to {selectedStatusRecord.publishedCollection}/{selectedStatusRecord.publishedDocId}
                    {selectedStatusRecord.publishedAt ? ` on ${new Date(selectedStatusRecord.publishedAt).toLocaleString()}` : ""}
                  </div>
                )}

                <div className="admin-grid-3">
                  <div style={{ background: "#091729", border: "1px solid #1a3a5c", borderRadius: 8, padding: 12 }}>
                    <div style={S.label}>Readiness</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{scorecard?.publishReadiness || "UNSCORED"}</div>
                    <div style={{ fontSize: 12, color: "#8aa3c8", marginTop: 6 }}>{scorecard?.readinessReason || "No QA scorecard found."}</div>
                  </div>
                  <div style={{ background: "#091729", border: "1px solid #1a3a5c", borderRadius: 8, padding: 12 }}>
                    <div style={S.label}>Score</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{scorecard?.overallScore ?? "--"}</div>
                    <div style={{ fontSize: 12, color: "#8aa3c8", marginTop: 6 }}>{scorecard?.assessmentMode || "No QA assessment"}</div>
                  </div>
                  <div style={{ background: "#091729", border: "1px solid #1a3a5c", borderRadius: 8, padding: 12 }}>
                    <div style={S.label}>Draft ID</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{selected.id}</div>
                    <div style={{ fontSize: 12, color: "#8aa3c8", marginTop: 6 }}>
                      {selected.kind === "news" ? "News candidate" : "Post candidate"}
                      {selected.draft?.styleProfile ? `  ${selected.draft.styleProfile}` : ""}
                    </div>
                  </div>
                </div>
              </div>

              <div className="admin-grid">
                <div style={S.card}>
                  <div style={S.label}>Excerpt</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7 }}>{selected.excerpt || "No excerpt."}</div>
                  {selected.summary && (
                    <>
                      <div style={{ ...S.label, marginTop: 16 }}>Summary</div>
                      <div style={{ fontSize: 14, lineHeight: 1.7 }}>{selected.summary}</div>
                    </>
                  )}
                  {selected.researchPacket && (
                    <>
                      <div style={{ ...S.label, marginTop: 16 }}>Research Packet</div>
                      <div style={{ fontSize: 13, color: "#8aa3c8", lineHeight: 1.6 }}>
                        {selected.researchPacket.topic?.title || "Untitled packet"}
                        {selected.researchPacket.styleProfile ? `  ${selected.researchPacket.styleProfile}` : ""}
                        {selected.researchPacket.sourceCount != null ? `  ${selected.researchPacket.sourceCount} sources` : ""}
                      </div>
                    </>
                  )}
                  {!!selected.titleAlternatives?.length && (
                    <>
                      <div style={{ ...S.label, marginTop: 16 }}>Title Alternatives</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {selected.titleAlternatives.map((title, index) => (
                          <div key={`${selected.id}-title-${index}`} style={{ background: "#091729", border: "1px solid #1a3a5c", borderRadius: 6, padding: 10, fontSize: 13 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>{title?.headline || String(title)}</div>
                            {title?.dek && <div style={{ color: "#8aa3c8", lineHeight: 1.6 }}>{title.dek}</div>}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                <div style={S.card}>
                  <div style={S.label}>QA Findings</div>
                  {!selected.qa && <div style={{ color: "#8aa3c8", fontSize: 13 }}>No QA report found for this draft yet.</div>}
                  {!!selected.qa && !findings.length && <div style={{ color: "#8aa3c8", fontSize: 13 }}>No flagged or blocking findings. QA passed cleanly.</div>}
                  {!!findings.length && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {findings.map((finding, index) => (
                        <div key={`${selected.id}-finding-${index}`} style={{ background: "#091729", border: "1px solid #1a3a5c", borderRadius: 6, padding: 10 }}>
                          <div style={{ ...S.badge, background: finding.level === "Block" ? "#4a1820" : "#4a3312", color: finding.level === "Block" ? "#ffb4b4" : "#f3ce8d", marginBottom: 8 }}>
                            {finding.level}
                          </div>
                          <div style={{ fontSize: 13, lineHeight: 1.6 }}>{finding.message}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {!!scorecard?.categoryScores && (
                    <>
                      <div style={{ ...S.label, marginTop: 16 }}>Category Scores</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {Object.entries(scorecard.categoryScores).map(([key, value]) => (
                          <div key={key} style={{ background: "#091729", border: "1px solid #1a3a5c", borderRadius: 6, padding: 10 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{key}</div>
                            <div style={{ fontSize: 12, color: "#8aa3c8" }}>
                              {value.score}/{value.maxScore}  {value.status}
                            </div>
                            <div style={{ fontSize: 12, color: "#8aa3c8", marginTop: 4 }}>{value.details}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div style={S.card}>
                <div style={S.label}>Draft Preview</div>
                <div style={{ ...S.preview, maxHeight: "none" }}>
                  <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28 }}>{selected.draft?.title || selected.title}</h1>
                  <SafeHTML html={marked.parse(selected.draft?.body || "")} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Migration Panel ──────────────────────────────────────────
function MigrationPanel({ user }) {
  const [status, setStatus] = useState("");
  const [running, setRunning] = useState(false);

  const migrate = async (type) => {
    setRunning(true);
    setStatus(`Fetching ${type}.json...`);
    try {
      const res = await fetch(`/${type}.json`);
      const data = await res.json();
      setStatus(`Importing ${data.length} ${type}...`);

      const saveFn = type === "posts" ? savePost : type === "guides" ? saveGuide : saveNews;
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const id = type === "posts" ? String(item.id) : item.id;
        await saveFn(id, item);
        setStatus(`Imported ${i + 1}/${data.length} ${type}`);
      }
      setStatus(`Done! Imported ${data.length} ${type}.`);
    } catch (e) {
      setStatus(`Error: ${formatAdminError(e, user, "import content into Firestore")}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 18, color: "#c9a84c", marginBottom: 12 }}>Import from JSON</h2>
      <p style={{ fontSize: 13, color: "#8aa3c8", marginBottom: 20 }}>
        Import existing posts, guides, and news from the static JSON files into Firestore.
        This is a one-time migration -- existing documents with the same ID will be overwritten.
      </p>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button onClick={() => migrate("posts")} disabled={running} style={{ ...S.btn, ...S.btnGold }}>Import Posts</button>
        <button onClick={() => migrate("guides")} disabled={running} style={{ ...S.btn, ...S.btnGold }}>Import Guides</button>
        <button onClick={() => migrate("news")} disabled={running} style={{ ...S.btn, ...S.btnGold }}>Import News</button>
      </div>
      {status && <div style={{ ...S.card, fontSize: 13, fontFamily: "'JetBrains Mono', monospace" }}>{status}</div>}
    </div>
  );
}

function SubscriptionPanel({ subscriptions, onSave, saving, user }) {
  const createEmptyForm = () => ({
    uid: "",
    email: "",
    plan: "free",
    status: "active",
    stripeCustomerId: "",
    stripeSubscriptionId: "",
    source: "admin-manual",
    currentPeriodEnd: "",
    cancelAtPeriodEnd: false,
  });
  const [form, setForm] = useState(createEmptyForm);
  const [localError, setLocalError] = useState("");

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setLocalError("");
    if (!form.uid.trim()) {
      setLocalError("UID is required.");
      return;
    }
    if (!form.email.trim()) {
      setLocalError("Email is required.");
      return;
    }
    try {
      await onSave({
        ...form,
        uid: form.uid.trim(),
        email: form.email.trim(),
        stripeCustomerId: form.stripeCustomerId.trim() || null,
        stripeSubscriptionId: form.stripeSubscriptionId.trim() || null,
        currentPeriodEnd: form.currentPeriodEnd.trim() || null,
        reviewerEmail: user?.email || null,
      });
      setForm(createEmptyForm());
    } catch (error) {
      setLocalError(error?.message || "Failed to save subscription.");
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 16, alignItems: "start" }}>
      <div style={S.card}>
        <h2 style={{ fontSize: 18, color: "#c9a84c", margin: "0 0 16px" }}>Subscriptions</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={S.label}>Firebase UID</label>
            <input style={S.input} value={form.uid} onChange={(e) => update("uid", e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Email</label>
            <input style={S.input} value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div style={S.grid}>
            <div>
              <label style={S.label}>Plan</label>
              <select style={S.input} value={form.plan} onChange={(e) => update("plan", e.target.value)}>
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="professional">Professional</option>
              </select>
            </div>
            <div>
              <label style={S.label}>Status</label>
              <select style={S.input} value={form.status} onChange={(e) => update("status", e.target.value)}>
                <option value="active">Active</option>
                <option value="trialing">Trialing</option>
                <option value="past_due">Past Due</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>
          <div>
            <label style={S.label}>Stripe Customer ID</label>
            <input style={S.input} value={form.stripeCustomerId} onChange={(e) => update("stripeCustomerId", e.target.value)} placeholder="cus_..." />
          </div>
          <div>
            <label style={S.label}>Stripe Subscription ID</label>
            <input style={S.input} value={form.stripeSubscriptionId} onChange={(e) => update("stripeSubscriptionId", e.target.value)} placeholder="sub_..." />
          </div>
          <div style={S.grid}>
            <div>
              <label style={S.label}>Source</label>
              <input style={S.input} value={form.source} onChange={(e) => update("source", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Current Period End</label>
              <input style={S.input} value={form.currentPeriodEnd} onChange={(e) => update("currentPeriodEnd", e.target.value)} placeholder="2026-04-07T00:00:00Z" />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#8aa3c8", cursor: "pointer" }}>
            <input type="checkbox" checked={form.cancelAtPeriodEnd} onChange={(e) => update("cancelAtPeriodEnd", e.target.checked)} />
            Cancel at period end
          </label>
          <button onClick={submit} disabled={saving} style={{ ...S.btn, ...S.btnGold }}>
            {saving ? "Saving..." : "Save Subscription"}
          </button>
          <button onClick={() => setForm(createEmptyForm())} disabled={saving} style={{ ...S.btn, ...S.btnOutline }}>
            Clear
          </button>
          {localError && <div style={{ color: "#ffb4b4", fontSize: 12 }}>{localError}</div>}
        </div>
      </div>

      <div style={S.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, color: "#c9a84c", margin: 0 }}>Current Subscription Records</h3>
          <span style={{ fontSize: 12, color: "#8aa3c8" }}>{subscriptions.length} records</span>
        </div>
        {!subscriptions.length && (
          <div style={{ fontSize: 13, color: "#8aa3c8" }}>
            No subscription records yet. Stripe checkout can still be used, but plan access remains free until a record is created.
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {subscriptions.map((subscription) => (
            <div key={subscription._id} style={{ background: "#091729", border: "1px solid #1a3a5c", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
                <div style={{ fontWeight: 600 }}>{subscription.email || subscription._id}</div>
                <span style={{ ...S.badge, background: "#152f4f", color: "#d8c18c" }}>{subscription.plan || "free"}</span>
              </div>
              <div style={{ fontSize: 12, color: "#8aa3c8", lineHeight: 1.6 }}>
                {subscription._id}
                {subscription.status ? `  ${subscription.status}` : ""}
                {subscription.currentPeriodEnd ? `  ${subscription.currentPeriodEnd}` : ""}
              </div>
              {(subscription.stripeCustomerId || subscription.stripeSubscriptionId) && (
                <div style={{ fontSize: 12, color: "#8aa3c8", marginTop: 6, lineHeight: 1.6 }}>
                  {subscription.stripeCustomerId || "No customer"} {subscription.stripeSubscriptionId ? `  ${subscription.stripeSubscriptionId}` : ""}
                </div>
              )}
              <button
                onClick={() => setForm({
                  uid: subscription._id,
                  email: subscription.email || "",
                  plan: subscription.plan || "free",
                  status: subscription.status || "active",
                  stripeCustomerId: subscription.stripeCustomerId || "",
                  stripeSubscriptionId: subscription.stripeSubscriptionId || "",
                  source: subscription.source || "admin-manual",
                  currentPeriodEnd: subscription.currentPeriodEnd || "",
                  cancelAtPeriodEnd: Boolean(subscription.cancelAtPeriodEnd),
                })}
                style={{ ...S.btn, ...S.btnOutline, fontSize: 11, marginTop: 10 }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Admin Component ─────────────────────────────────────
export default function Admin() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [guides, setGuides] = useState([]);
  const [news, setNews] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [pipelineItems, setPipelineItems] = useState([]);
  const [pipelineStatuses, setPipelineStatuses] = useState({});
  const [pipelineSavingId, setPipelineSavingId] = useState(null);
  const [subscriptionSaving, setSubscriptionSaving] = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(lazyAuth(), (u) => {
      setUser(isAdmin(u) ? u : null);
      setAuthLoading(false);
    });
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setActionError("");
    const [
      firestorePostsResult,
      firestoreArticlesResult,
      firestoreGuidesResult,
      firestoreNewsResult,
      firestorePipelineReviewsResult,
      firestoreSubscriptionsResult,
      staticContentResult,
      reviewQueueResult,
    ] = await Promise.allSettled([
      getPosts(true),
      getArticles(),
      getGuides(),
      getNews(true),
      getPipelineReviews(),
      getSubscriptions(),
      loadStaticAdminContent(),
      loadReviewQueue(),
    ]);

    const firestorePosts = firestorePostsResult.status === "fulfilled" ? firestorePostsResult.value : [];
    const firestoreArticles = firestoreArticlesResult.status === "fulfilled" ? firestoreArticlesResult.value : [];
    const firestoreGuides = firestoreGuidesResult.status === "fulfilled" ? firestoreGuidesResult.value : [];
    const firestoreNews = firestoreNewsResult.status === "fulfilled" ? firestoreNewsResult.value : [];
    const firestorePipelineReviews = firestorePipelineReviewsResult.status === "fulfilled" ? firestorePipelineReviewsResult.value : [];
    const firestoreSubscriptions = firestoreSubscriptionsResult.status === "fulfilled" ? firestoreSubscriptionsResult.value : [];
    const staticContent = staticContentResult.status === "fulfilled"
      ? staticContentResult.value
      : { posts: [], guides: [], news: [] };
    const reviewQueue = reviewQueueResult.status === "fulfilled" ? reviewQueueResult.value : [];

    setPosts(mergeItemsById(mergeArticleSets(firestorePosts, firestoreArticles), staticContent.posts));
    setGuides(mergeItemsById(firestoreGuides, staticContent.guides));
    setNews(mergeItemsById(firestoreNews, staticContent.news));
    setSubscriptions(firestoreSubscriptions);
    setPipelineItems(reviewQueue);
    setPipelineStatuses(mapPipelineReviews(firestorePipelineReviews));

    const firestoreErrors = [
      firestorePostsResult,
      firestoreArticlesResult,
      firestoreGuidesResult,
      firestoreNewsResult,
      firestorePipelineReviewsResult,
      firestoreSubscriptionsResult,
    ]
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason);

    if (staticContentResult.status === "rejected" && firestoreErrors.length) {
      console.error("Failed to load admin data from Firebase and static JSON.", firestoreErrors[0], staticContentResult.reason);
      setActionError(formatAdminError(firestoreErrors[0], user, "load admin content"));
    } else if (firestoreErrors.length) {
      console.warn("Firebase admin reads failed; showing static JSON fallback instead.", firestoreErrors[0]);
    }

    setLoading(false);
  }, [user]);

  const persistPublishedPipelineState = useCallback(async (pipelineId, publishedCollection, publishedDocId) => {
    if (!pipelineId) return;
    await savePipelineReview(pipelineId, {
      status: "published",
      reviewerEmail: user?.email || null,
      publishedCollection,
      publishedDocId: String(publishedDocId),
      publishedAt: new Date().toISOString(),
      hidden: false,
    });
  }, [user]);

  const handleSetPipelineStatus = useCallback(async (id, status) => {
    setActionError("");
    const key = String(id);
    const previousStatus = pipelineStatuses[key];
    const optimisticStatus = status ? {
      ...previousStatus,
      status,
      reviewerEmail: user?.email || null,
      updatedAt: new Date().toISOString(),
    } : null;

    setPipelineSavingId(key);
    setPipelineStatuses((current) => {
      const next = { ...current };
      if (!optimisticStatus) delete next[key];
      else next[key] = optimisticStatus;
      return next;
    });

    try {
      if (!status) {
        await deletePipelineReview(id);
        return;
      }

      const nextStatus = {
        ...previousStatus,
        status,
        reviewerEmail: user?.email || null,
        updatedAt: new Date().toISOString(),
      };
      if (status === "rejected" && previousStatus?.publishedCollection && previousStatus?.publishedDocId) {
        const hiddenPayload = { hidden: true };
        if (previousStatus.publishedCollection === "news") {
          await saveNews(previousStatus.publishedDocId, hiddenPayload);
        } else if (previousStatus.publishedCollection === "articles") {
          await saveArticle(previousStatus.publishedDocId, hiddenPayload);
        } else {
          await savePost(previousStatus.publishedDocId, hiddenPayload);
        }
        nextStatus.hidden = true;
      }
      await savePipelineReview(id, nextStatus);
      await loadData();
    } catch (e) {
      setPipelineStatuses((current) => {
        const next = { ...current };
        if (previousStatus) next[key] = previousStatus;
        else delete next[key];
        return next;
      });
      setActionError(formatAdminError(e, user, "update pipeline review state"));
    } finally {
      setPipelineSavingId(null);
    }
  }, [loadData, pipelineStatuses, user]);

  const handleOpenPipelineDraft = useCallback((item) => {
    if (!item?.draft) return;
    if (item.kind === "news") {
      setEditing({ type: "news", item: { ...item.draft, _pipelineId: item.id } });
      return;
    }
    setEditing({ type: "posts", item: { ...item.draft, _collection: "posts", _pipelineId: item.id } });
  }, []);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  if (authLoading) {
    return <div style={{ ...S.page, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color: "#8aa3c8" }}>Loading...</span>
    </div>;
  }

  if (!user) return <LoginScreen />;

  const handleSavePost = async (form) => {
    setActionError("");
    try {
      const collection = resolveArticleCollection(form);
      const payload = { ...form };
      const pipelineId = payload._pipelineId;
      delete payload._collection;
      delete payload._id;
      delete payload._pipelineId;
      if (collection === "articles") await saveArticle(String(form.id), payload);
      else await savePost(String(form.id), payload);
      await persistPublishedPipelineState(pipelineId, collection, form.id);
      setEditing(null);
      await loadData();
    } catch (e) {
      setActionError(formatAdminError(e, user, "save posts"));
    }
  };

  const handleSaveGuide = async (form) => {
    setActionError("");
    try {
      await saveGuide(form.id, form);
      setEditing(null);
      await loadData();
    } catch (e) {
      setActionError(formatAdminError(e, user, "save guides"));
    }
  };

  const handleSaveNews = async (form) => {
    setActionError("");
    try {
      const payload = { ...form };
      const pipelineId = payload._pipelineId;
      delete payload._pipelineId;
      await saveNews(form.id, payload);
      await persistPublishedPipelineState(pipelineId, "news", form.id);
      setEditing(null);
      await loadData();
    } catch (e) {
      setActionError(formatAdminError(e, user, "save news"));
    }
  };

  const handleSaveSubscription = async (form) => {
    setActionError("");
    setSubscriptionSaving(true);
    try {
      await saveSubscription(form.uid, {
        email: form.email,
        plan: form.plan,
        status: form.status,
        stripeCustomerId: form.stripeCustomerId,
        stripeSubscriptionId: form.stripeSubscriptionId,
        source: form.source,
        currentPeriodEnd: form.currentPeriodEnd,
        cancelAtPeriodEnd: Boolean(form.cancelAtPeriodEnd),
      });
      await loadData();
    } catch (e) {
      setActionError(formatAdminError(e, user, "save subscriptions"));
      throw e;
    } finally {
      setSubscriptionSaving(false);
    }
  };

  const handleDelete = async (type, item) => {
    setActionError("");
    try {
      const id = item._id || item.id;
      if (type === "posts") {
        if (resolveArticleCollection(item) === "articles") await deleteArticle(id);
        else await deletePost(id);
      }
      else if (type === "guides") await deleteGuide(id);
      else await deleteNewsItem(id);
      await loadData();
    } catch (e) {
      setActionError(formatAdminError(e, user, `delete ${type}`));
    }
  };

  const TABS = [
    { key: "posts", label: "Posts" },
    { key: "guides", label: "Guides" },
    { key: "news", label: "News" },
    { key: "pipeline", label: "Pipeline" },
    { key: "subscriptions", label: "Subscriptions" },
    { key: "migrate", label: "Import" },
  ];

  return (
    <div style={S.page}>
      <header className="admin-header">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={S.title}>V2V Admin</span>
          {loading && <span style={{ fontSize: 11, color: "#8aa3c8" }}>Loading...</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#8aa3c8" }}>{user.email}</span>
          <button onClick={() => signOut(lazyAuth())} style={{ ...S.btn, ...S.btnOutline, fontSize: 11 }}>Sign Out</button>
        </div>
      </header>

      <div className="admin-container">
        {actionError && (
          <div style={{ ...S.card, border: "1px solid #6b2a34", background: "#2a1520", color: "#ffb4b4", marginBottom: 20 }}>
            {actionError}
          </div>
        )}
        {editing ? (
          editing.type === "posts" ? (
            <PostEditor post={editing.item} onSave={handleSavePost} onCancel={() => setEditing(null)} user={user} />
          ) : editing.type === "guides" ? (
            <GuideEditor guide={editing.item} onSave={handleSaveGuide} onCancel={() => setEditing(null)} user={user} />
          ) : (
            <NewsEditor item={editing.item} onSave={handleSaveNews} onCancel={() => setEditing(null)} user={user} />
          )
        ) : (
          <>
            <div className="admin-tabs">
              {TABS.map(t => (
                <div key={t.key} onClick={() => setTab(t.key)}
                  style={{ ...S.tab, ...(tab === t.key ? S.tabActive : {}) }}>
                  {t.label}
                  {t.key !== "migrate" && (
                    <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.6 }}>
                      {t.key === "posts"
                        ? posts.length
                        : t.key === "guides"
                          ? guides.length
                          : t.key === "news"
                            ? news.length
                            : t.key === "subscriptions"
                              ? subscriptions.length
                              : pipelineItems.length}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {tab === "posts" && (
              <ItemList items={posts} type="posts"
                onEdit={item => setEditing({ type: "posts", item })}
                onDelete={item => handleDelete("posts", item)}
                onCreate={() => setEditing({ type: "posts", item: null })}
              />
            )}
            {tab === "guides" && (
              <ItemList items={guides} type="guides"
                onEdit={item => setEditing({ type: "guides", item })}
                onDelete={item => handleDelete("guides", item)}
                onCreate={() => setEditing({ type: "guides", item: null })}
              />
            )}
            {tab === "news" && (
              <ItemList items={news} type="news"
                onEdit={item => setEditing({ type: "news", item })}
                onDelete={item => handleDelete("news", item)}
                onCreate={() => setEditing({ type: "news", item: null })}
              />
            )}
            {tab === "pipeline" && (
              <PipelineReviewPanel
                items={pipelineItems}
                statuses={pipelineStatuses}
                savingId={pipelineSavingId}
                onSetStatus={handleSetPipelineStatus}
                onOpenEditor={handleOpenPipelineDraft}
                onRebuild={!import.meta.env.DEV ? null : async () => {
                  try {
                    const res = await fetch("/__rebuild");
                    if (!res.ok) throw new Error("Server returned " + res.status);
                    const data = await res.json();
                    if (data.ok) window.location.reload();
                    else throw new Error(data.error);
                  } catch (e) {
                    alert("Rebuild failed: " + e.message);
                  }
                }}
              />
            )}
            {tab === "subscriptions" && (
              <SubscriptionPanel
                subscriptions={subscriptions}
                onSave={handleSaveSubscription}
                saving={subscriptionSaving}
                user={user}
              />
            )}
            {tab === "migrate" && <MigrationPanel user={user} />}
          </>
        )}
      </div>
    </div>
  );
}
