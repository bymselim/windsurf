/**
 * Client-side state for session log updates (pagesVisited, artworksViewed, orderClicked).
 * Flush on page unload via PATCH /api/access-log.
 */

const state = {
  pagesVisited: [] as string[],
  artworksViewed: [] as string[],
  orderClicked: false,
};

function addPage(path: string) {
  if (!state.pagesVisited.includes(path)) {
    state.pagesVisited.push(path);
  }
}

function addArtwork(id: string) {
  if (!state.artworksViewed.includes(id)) {
    state.artworksViewed.push(id);
  }
}

function setOrderClicked() {
  state.orderClicked = true;
}

export function recordPage(path: string) {
  addPage(path);
}

export function recordArtworkViewed(artworkId: string) {
  addArtwork(artworkId);
}

export function recordOrderClicked() {
  setOrderClicked();
}

export function flushSessionLog() {
  const sessionEnd = new Date().toISOString();
  const payload = JSON.stringify({
    sessionEnd,
    pagesVisited: state.pagesVisited,
    artworksViewed: state.artworksViewed,
    orderClicked: state.orderClicked,
  });
  fetch("/api/access-log", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: payload,
    credentials: "include",
    keepalive: true,
  }).catch(() => {});
}
