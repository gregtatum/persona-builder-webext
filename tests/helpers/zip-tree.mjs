// @ts-check
import {
  BlobReader as ZipBlobReader,
  ZipReader,
  configure as configureZip,
} from "../../vendor/zipjs/index.js";

/**
 * Return a tree string (like `tree`) for the entries in a zip blob.
 * @param {Blob} zipBlob
 * @returns {Promise<string>}
 */
export async function zipTree(zipBlob) {
  configureZip({ useWebWorkers: false });
  const reader = new ZipReader(new ZipBlobReader(zipBlob));
  const entries = await reader.getEntries();
  await reader.close();
  const paths = entries.map((entry) => entry.filename).sort();
  return renderTree(paths);
}

/**
 * Build an ASCII tree from file paths.
 * @param {string[]} paths
 * @returns {string}
 */
export function renderTree(paths) {
  /** @type {TreeNode} */
  const root = { name: ".", children: new Map(), isDir: true };

  for (const path of paths) {
    const parts = path.split("/").filter(Boolean);
    let current = root;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      const isDir = i < parts.length - 1;
      const existing = current.children.get(part);
      if (existing) {
        current = existing;
        continue;
      }
      /** @type {TreeNode} */
      const node = { name: part, children: new Map(), isDir };
      current.children.set(part, node);
      current = node;
    }
  }

  const lines = [root.name];
  const walk = (node, prefix) => {
    const entries = Array.from(node.children.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    entries.forEach((child, index) => {
      const isLast = index === entries.length - 1;
      const branch = isLast ? "└── " : "├── ";
      lines.push(`${prefix}${branch}${child.name}`);
      const nextPrefix = `${prefix}${isLast ? "    " : "│   "}`;
      if (child.children.size) {
        walk(child, nextPrefix);
      }
    });
  };

  walk(root, "");
  return lines.join("\n");
}

/**
 * @typedef TreeNode
 * @property {string} name
 * @property {Map<string, TreeNode>} children
 * @property {boolean} isDir
 */
