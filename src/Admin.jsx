import { useState, useEffect, useCallback, useRef } from "react";
import { lazyAuth, lazyGoogleProvider } from "./firebase.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import {
  getPosts, getArticles, getGuides, getNews,
  savePost, saveArticle, saveGuide, saveNews,
  deletePost, deleteArticle, deleteGuide, deleteNewsItem,
  uploadImage,
} from "./firestore.js";
import { marked } from "marked";
import DOMPurify from "dompurify";

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
    return `Firebase denied the write for ${email}. This admin UI is working, but your Firestore or Storage security rules do not allow this account to ${action}. Update the Firebase rules for the vaclaims-194006 project to allow the admin user to write posts, guides, news, and uploaded images.`;
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, color: "#c9a84c" }}>{post ? "Edit Post" : "New Post"}</h2>
        <div style={{ display: "flex", gap: 8 }}>
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
          <div style={S.grid}>
            <div>
              <label style={S.label}>Title</label>
              <input style={S.input} value={form.title} onChange={e => update("title", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Category</label>
              <input style={S.input} value={form.category} onChange={e => update("category", e.target.value)} />
            </div>
          </div>
          <div style={S.grid}>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, color: "#c9a84c" }}>{guide ? "Edit Guide" : "New Guide"}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel} style={{ ...S.btn, ...S.btnOutline }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{ ...S.btn, ...S.btnGold }}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={S.grid}>
          <div>
            <label style={S.label}>Guide ID (slug)</label>
            <input style={S.input} value={form.id} onChange={e => update("id", e.target.value)} disabled={!!guide} />
          </div>
          <div>
            <label style={S.label}>Title</label>
            <input style={S.input} value={form.title} onChange={e => update("title", e.target.value)} />
          </div>
        </div>
        <div style={S.grid}>
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ fontSize: 18, color: "#c9a84c" }}>{item ? "Edit News" : "New News Item"}</h2>
        <div style={{ display: "flex", gap: 8 }}>
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
          <div style={S.grid}>
            <div>
              <label style={S.label}>Category</label>
              <input style={S.input} value={form.category} onChange={e => update("category", e.target.value)} />
            </div>
            <div>
              <label style={S.label}>Date</label>
              <input style={S.input} value={form.date} onChange={e => update("date", e.target.value)} />
            </div>
          </div>
          <div style={S.grid}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={form.breaking} onChange={e => update("breaking", e.target.checked)} />
            <span style={{ fontSize: 13, color: "#8aa3c8" }}>Breaking News</span>
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

// ── Main Admin Component ─────────────────────────────────────
export default function Admin() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("posts");
  const [posts, setPosts] = useState([]);
  const [guides, setGuides] = useState([]);
  const [news, setNews] = useState([]);
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
      staticContentResult,
    ] = await Promise.allSettled([
      getPosts(),
      getArticles(),
      getGuides(),
      getNews(),
      loadStaticAdminContent(),
    ]);

    const firestorePosts = firestorePostsResult.status === "fulfilled" ? firestorePostsResult.value : [];
    const firestoreArticles = firestoreArticlesResult.status === "fulfilled" ? firestoreArticlesResult.value : [];
    const firestoreGuides = firestoreGuidesResult.status === "fulfilled" ? firestoreGuidesResult.value : [];
    const firestoreNews = firestoreNewsResult.status === "fulfilled" ? firestoreNewsResult.value : [];
    const staticContent = staticContentResult.status === "fulfilled"
      ? staticContentResult.value
      : { posts: [], guides: [], news: [] };

    setPosts(mergeItemsById(mergeArticleSets(firestorePosts, firestoreArticles), staticContent.posts));
    setGuides(mergeItemsById(firestoreGuides, staticContent.guides));
    setNews(mergeItemsById(firestoreNews, staticContent.news));

    const firestoreErrors = [
      firestorePostsResult,
      firestoreArticlesResult,
      firestoreGuidesResult,
      firestoreNewsResult,
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
      delete payload._collection;
      delete payload._id;
      if (collection === "articles") await saveArticle(String(form.id), payload);
      else await savePost(String(form.id), payload);
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
      await saveNews(form.id, form);
      setEditing(null);
      await loadData();
    } catch (e) {
      setActionError(formatAdminError(e, user, "save news"));
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
    { key: "migrate", label: "Import" },
  ];

  return (
    <div style={S.page}>
      <header style={S.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={S.title}>V2V Admin</span>
          {loading && <span style={{ fontSize: 11, color: "#8aa3c8" }}>Loading...</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 12, color: "#8aa3c8" }}>{user.email}</span>
          <button onClick={() => signOut(lazyAuth())} style={{ ...S.btn, ...S.btnOutline, fontSize: 11 }}>Sign Out</button>
        </div>
      </header>

      <div style={S.container}>
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
            <div style={S.tabs}>
              {TABS.map(t => (
                <div key={t.key} onClick={() => setTab(t.key)}
                  style={{ ...S.tab, ...(tab === t.key ? S.tabActive : {}) }}>
                  {t.label}
                  {t.key !== "migrate" && (
                    <span style={{ marginLeft: 6, fontSize: 10, opacity: 0.6 }}>
                      {t.key === "posts" ? posts.length : t.key === "guides" ? guides.length : news.length}
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
            {tab === "migrate" && <MigrationPanel user={user} />}
          </>
        )}
      </div>
    </div>
  );
}
