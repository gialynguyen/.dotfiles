import { strict as assert } from "node:assert";
import { Editor } from "@earendil-works/pi-tui";
import { HistoryEditor } from "./index.ts";

function pass(name: string): void {
	console.log(`PASS ${name}`);
}

// Minimal stubs: the HistoryEditor constructor only assigns fields and never
// invokes methods, so empty objects (cast to the expected shapes) suffice.
// EditorLike/KeybindingsManager/StatusSetter are internal to index.ts, so the
// stubs are cast through `unknown` via ConstructorParameters.
const inner = {} as unknown as ConstructorParameters<typeof HistoryEditor>[0];
const keybindings = {} as unknown as ConstructorParameters<typeof HistoryEditor>[2];
const editor = new HistoryEditor(inner, () => [], keybindings, () => {});

assert.equal(editor instanceof Editor, true);
pass("HistoryEditor passes instanceof Editor");

assert.equal(({}) instanceof Editor, false);
pass("plain object does not pass instanceof Editor (would fail before the fix)");

assert.equal(
	Object.getPrototypeOf(Object.getPrototypeOf(editor)) === Editor.prototype,
	true,
);
pass("Editor.prototype is spliced directly into HistoryEditor's prototype chain");