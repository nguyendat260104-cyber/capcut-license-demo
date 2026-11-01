ObjC.import("Foundation");

function readText(path) {
  const value = $.NSString.stringWithContentsOfFileEncodingError(path, $.NSUTF8StringEncoding, null);
  return value ? ObjC.unwrap(value) : null;
}

function writeText(path, value) {
  return $(value).writeToFileAtomicallyEncodingError(path, true, $.NSUTF8StringEncoding, null);
}

function run(argv) {
  const rootPath = argv[0];
  const storePath = rootPath + "/CombinationPresetVirtualStore.json";
  const manager = $.NSFileManager.defaultManager;
  let store = { preset_virtual_store: [{ type: 0, value: [] }] };
  const current = readText(storePath);
  if (current) {
    try { store = JSON.parse(current); } catch (_) {}
    manager.copyItemAtPathToPathError(storePath, storePath + ".presetkey.bak", null);
  }
  if (!Array.isArray(store.preset_virtual_store) || !store.preset_virtual_store.length) {
    store.preset_virtual_store = [{ type: 0, value: [] }];
  }
  const slot = store.preset_virtual_store[0];
  if (!Array.isArray(slot.value)) slot.value = [];
  const ids = new Set(slot.value.map((item) => String(item.id)));
  const directories = ObjC.unwrap(manager.contentsOfDirectoryAtPathError(rootPath, null)) || [];
  directories.forEach((nameValue) => {
    const name = String(nameValue);
    let isDirectory = Ref();
    const directory = rootPath + "/" + name;
    if (!manager.fileExistsAtPathIsDirectory(directory, isDirectory) || !isDirectory[0]) return;
    const candidates = [directory + "/" + name + ".json"];
    const files = ObjC.unwrap(manager.contentsOfDirectoryAtPathError(directory, null)) || [];
    files.filter((file) => String(file).endsWith(".json")).forEach((file) => candidates.push(directory + "/" + file));
    for (const candidate of candidates) {
      const raw = readText(candidate);
      if (!raw) continue;
      try {
        const meta = JSON.parse(raw);
        if (!meta.id || ids.has(String(meta.id))) break;
        slot.value.unshift({ copyright_type: "", enterprise_id: "", id: String(meta.id), is_enterprise_edition: false,
          name: String(meta.name || name), save_from: 0, subsystem_id: "", type: 1, user_id: "" });
        ids.add(String(meta.id));
        break;
      } catch (_) {}
    }
  });
  writeText(storePath + ".tmp", JSON.stringify(store, null, 2));
  manager.removeItemAtPathError(storePath, null);
  manager.moveItemAtPathToPathError(storePath + ".tmp", storePath, null);
}
