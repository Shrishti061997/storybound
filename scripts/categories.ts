// Prints the four categories we use and their live options. Run: npm run categories
import { CATEGORY_NAMES, findCategory, getCategory, listCategories } from "../lib/arcade";

async function main() {
  const items = await listCategories();
  console.log(`${items.length} categories available\n`);
  for (const name of CATEGORY_NAMES) {
    const cat = findCategory(items, name);
    if (!cat) {
      console.log(`${name}: NOT FOUND`);
      continue;
    }
    const d = await getCategory(cat.categoryId, {});
    console.log(`${name}  ->  "${cat.name}"  world=${cat.world}  canManufacture=${d.canManufacture}`);
    for (const o of d.options) {
      const values = o.values.map((v) => `${v.label}${v.isDefault ? "*" : ""}${v.available ? "" : " (unavailable)"}`).join(" | ");
      console.log(`   ${o.label} [${o.key}]: ${values}`);
    }
    console.log(`   default selections: ${JSON.stringify(d.selections)}\n`);
  }
  console.log("All categories:", items.map((c) => `${c.name} (${c.world})`).join(", "));
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
