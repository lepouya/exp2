import assign from "../utils/assign";
import * as LocalStore from "../utils/localStorage";
import * as Store from "../utils/store";
import { genResourceManager, Resource, ResourceManager } from "./Resource";
import { defaultSettings, Settings } from "./Settings";

export type Context<TickResult = any> = {
  settings: Settings;
  resourceManager: ResourceManager<Context<TickResult>, TickResult>;

  init: (this: Context<TickResult>) => void;
};

export function emptyContext<TickResult>(
  oldContext?: Partial<Context<TickResult>>,
): Context<TickResult> {
  const context = (oldContext || {}) as Context<TickResult>;

  context.init ??= () => {};
  context.settings = {
    ...defaultSettings,
    lastReset: Date.now(),
    lastUpdate: Date.now(),
    lastLoaded: Date.now(),
  };
  context.resourceManager = genResourceManager(context, context.settings);

  context.init();
  return Store.setSaveProperties(context, ["settings", "resourceManager"]);
}

export function wrapContext<TickResult>(context: Context<TickResult>) {
  return {
    ...context.resourceManager,
    ...context,
    context,

    resource: (res: string | Resource<Context<TickResult>, TickResult>) =>
      context.resourceManager.get(res),

    load: () => _load(context, LocalStore.loadFromBrowser(_store)),
    loadAs: (loadStr: string) => _load(context, loadStr),

    save: (pretty?: boolean) =>
      LocalStore.saveToBrowser(_store, _save(context, pretty)),
    saveAs: (pretty?: boolean) => _save(context, pretty),

    reset: () => _reset(context),
  };
}

const _store = globalThis.gamePackage.name;

function _load<TickResult>(
  context: Context<TickResult>,
  loadStr: string | null,
): boolean {
  const newContext = { ...context };
  const loaded = !!loadStr && Store.loadAs(newContext, loadStr);

  if (loaded) {
    context.init();

    let settingsKey: keyof typeof newContext.settings;
    for (settingsKey in newContext.settings) {
      assign(context.settings, settingsKey, newContext.settings[settingsKey]);
    }

    Object.values(newContext.resourceManager.resources || {}).forEach((res) =>
      context.resourceManager.upsert(res),
    );

    context.settings.lastLoaded = Date.now();
    context.resourceManager.update(undefined, "load");
  }

  return loaded;
}

function _save<TickResult>(
  context: Context<TickResult>,
  pretty?: boolean,
): string {
  context.settings.lastSaved = Date.now();
  return Store.saveAs(context, pretty);
}

function _reset<TickResult>(context: Context<TickResult>): void {
  LocalStore.resetOnBrowser(_store);
  emptyContext(context);
}
