const dungeonAssets = import.meta.glob("../assets/dungeon/**/*", {
  eager: true,
  import: "default",
  query: "?url",
}) as Record<string, string>;

function dungeonAsset(path: string) {
  return dungeonAssets[`../assets/dungeon/${path}`] ?? `/assets/dungeon/${path}`;
}

export function dungeonElementAsset(name: string) {
  return dungeonAsset(`elements/${name}.png`);
}

export function dungeonNewAsset(name: string) {
  return dungeonAsset(`new/${name}.png`);
}

export function dungeonPropAsset(name: string) {
  return dungeonAsset(`props/${name}.png`);
}
