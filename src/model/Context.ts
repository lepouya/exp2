import * as LocalStore from "../utils/localStorage";
import Obj from "../utils/objects";
import * as Store from "../utils/store";
import { genPopupManager, PopupManager } from "./Popup";
import { genResourceManager, ResourceManager } from "./Resource";
import { defaultSettings, Settings } from "./Settings";

export type Context<TickResult = any> = {
  settings: Settings;
  resourceManager: ResourceManager<Context<TickResult>, TickResult>;
  popupManager: PopupManager<Context<TickResult>>;

  init: (this: Context<TickResult>) => void;
  load: () => boolean;
  loadAs: (loadStr: string) => boolean;
  save: (pretty?: boolean) => void;
  saveAs: (pretty?: boolean) => string;
  reset: () => void;
};

export const ContextInitializers: ((context: Context) => void)[] = [];

export function emptyContext<TickResult>(
  oldContext?: Partial<Context<TickResult>>,
): Context<TickResult> {
  const context = (oldContext || {}) as Context<TickResult>;

  context.init ??= () => {};
  context.load = () => _load(context, LocalStore.loadFromBrowser(_store));
  context.loadAs = (loadStr: string) => _load(context, loadStr);
  context.save = (pretty?: boolean) =>
    LocalStore.saveToBrowser(_store, _save(context, pretty));
  context.saveAs = (pretty?: boolean) => _save(context, pretty);
  context.reset = () => _reset(context);

  context.settings = {
    ...defaultSettings,
    lastReset: Date.now(),
    lastUpdate: Date.now(),
    lastLoaded: Date.now(),
  };
  context.resourceManager = genResourceManager(context, context.settings);
  context.popupManager ??= genPopupManager(context, context.resourceManager);

  context.init();
  ContextInitializers.forEach((init) => init(context));

  return Store.setSaveProperties(context, ["settings", "resourceManager"]);
}

export function wrapContext<TickResult>(context: Context<TickResult>) {
  return { ...context.resourceManager, ...context, context };
}

const _store = globalThis.gamePackage.name;

function _load<TickResult>(
  context: Context<TickResult>,
  loadStr: string | null,
): boolean {
  const newContext = { ...context };
  const loaded = !!loadStr && Store.loadAs(newContext, loadStr);

  context.init();
  ContextInitializers.forEach((init) => init(context));

  if (loaded) {
    Obj.copy(newContext.settings, context.settings);
    Object.values(newContext.resourceManager.resources || {}).forEach((res) =>
      context.resourceManager.upsert(res),
    );
  }

  context.settings.lastLoaded = Date.now();
  context.resourceManager.update(undefined, "load");

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
