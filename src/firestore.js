import { lazyDb, lazyStorage } from "./firebase.js";
import {
  collection, doc, getDocs, getDoc, setDoc, deleteDoc, addDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import {
  ref, uploadBytes, getDownloadURL, deleteObject,
} from "firebase/storage";

// ── Collections ──────────────────────────────────────────────
const POSTS = "posts";
const ARTICLES = "articles";
const GUIDES = "guides";
const NEWS = "news";
const SUBSCRIBERS = "subscribers";
const PIPELINE_REVIEWS = "pipelineReviews";
const RESEARCH_PACKETS = "researchPackets";
const SUBSCRIPTIONS = "subscriptions";
const USAGE_METERS = "usageMeters";

function compareDesc(a, b) {
  if (a === b) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" }) * -1;
}

async function getCollectionDocs(name, sortField) {
  const snap = await getDocs(collection(lazyDb(), name));
  const docs = snap.docs.map((d) => ({ ...d.data(), _id: d.id, _collection: name }));
  if (!sortField) return docs;
  return docs.sort((a, b) => compareDesc(a[sortField], b[sortField]));
}

function hideFiltered(items, includeHidden = false) {
  if (includeHidden) return items;
  return items.filter((item) => !item.hidden);
}

// ── Read ─────────────────────────────────────────────────────
export async function getPosts(includeHidden = false) {
  return hideFiltered(await getCollectionDocs(POSTS, "date"), includeHidden);
}

export async function getArticles() {
  return getCollectionDocs(ARTICLES, "date");
}

export async function getGuides() {
  return getCollectionDocs(GUIDES);
}

export async function getNews(includeHidden = false) {
  return hideFiltered(await getCollectionDocs(NEWS, "timestamp"), includeHidden);
}

export async function getPipelineReviews() {
  return getCollectionDocs(PIPELINE_REVIEWS, "updatedAt");
}

export async function getResearchPackets() {
  return getCollectionDocs(RESEARCH_PACKETS, "compiledAt");
}

export async function getSubscription(uid) {
  const snap = await getDoc(doc(lazyDb(), SUBSCRIPTIONS, String(uid)));
  return snap.exists() ? { ...snap.data(), _id: snap.id } : null;
}

export async function getSubscriptions() {
  return getCollectionDocs(SUBSCRIPTIONS, "updatedAt");
}

export async function getUsageMeter(uid, monthKey) {
  const snap = await getDoc(doc(lazyDb(), USAGE_METERS, `${uid}_${monthKey}`));
  return snap.exists() ? { ...snap.data(), _id: snap.id } : null;
}

export async function getPost(id) {
  const snap = await getDoc(doc(lazyDb(), POSTS, String(id)));
  return snap.exists() ? { ...snap.data(), _id: snap.id } : null;
}

export async function getGuide(id) {
  const snap = await getDoc(doc(lazyDb(), GUIDES, id));
  return snap.exists() ? { ...snap.data(), _id: snap.id } : null;
}

// ── Write ────────────────────────────────────────────────────
export async function savePost(id, data) {
  await setDoc(doc(lazyDb(), POSTS, String(id)), data, { merge: true });
}

export async function saveArticle(id, data) {
  await setDoc(doc(lazyDb(), ARTICLES, String(id)), data, { merge: true });
}

export async function saveGuide(id, data) {
  await setDoc(doc(lazyDb(), GUIDES, id), data, { merge: true });
}

export async function saveNews(id, data) {
  await setDoc(doc(lazyDb(), NEWS, id), data, { merge: true });
}

export async function savePipelineReview(id, data) {
  await setDoc(doc(lazyDb(), PIPELINE_REVIEWS, String(id)), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function saveResearchPacket(id, data) {
  await setDoc(doc(lazyDb(), RESEARCH_PACKETS, String(id)), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function saveSubscription(uid, data) {
  await setDoc(doc(lazyDb(), SUBSCRIPTIONS, String(uid)), {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function incrementUsageMeter(uid, monthKey, toolSlug, meta = {}) {
  await setDoc(doc(lazyDb(), USAGE_METERS, `${uid}_${monthKey}`), {
    uid,
    monthKey,
    [`tools.${toolSlug}`]: increment(1),
    lastTool: toolSlug,
    lastRunMeta: meta,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function deletePost(id) {
  await deleteDoc(doc(lazyDb(), POSTS, String(id)));
}

export async function deleteArticle(id) {
  await deleteDoc(doc(lazyDb(), ARTICLES, String(id)));
}

export async function deleteGuide(id) {
  await deleteDoc(doc(lazyDb(), GUIDES, id));
}

export async function deleteNewsItem(id) {
  await deleteDoc(doc(lazyDb(), NEWS, id));
}

export async function deletePipelineReview(id) {
  await deleteDoc(doc(lazyDb(), PIPELINE_REVIEWS, String(id)));
}

// ── Subscribers ─────────────────────────────────────────────
export async function addSubscriber(email) {
  await addDoc(collection(lazyDb(), SUBSCRIBERS), {
    email,
    subscribedAt: serverTimestamp(),
  });
}

// ── Storage ──────────────────────────────────────────────────
export async function uploadImage(path, file) {
  const storageRef = ref(lazyStorage(), path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function deleteImage(path) {
  try {
    await deleteObject(ref(lazyStorage(), path));
  } catch (e) {
    if (e.code !== "storage/object-not-found") throw e;
  }
}
