import { Context } from "../model/Context";
import Format from "../utils/format";
import ResourceRender from "./ResourceRender";

export default function registerOfflineSummary(context: Context) {
  context.nuxManager.register({
    name: "OfflineSummary",
    title: "While you were offline...",
    bounds: { height: "32em" },
    body(_, manager) {
      const rm = manager.context.resourceManager;
      const loadUpdate = rm.execution.load;
      const keys = Object.keys(loadUpdate?.lastChanges ?? {});
      let remainder = 0;

      if (!loadUpdate) {
        return null;
      } else if (keys.length === 0) {
        return <div className="full">Nothing happened!</div>;
      } else if (keys.length > 12) {
        remainder = keys.length - 11;
        keys.splice(11);
      }
      return (
        <>
          <div className="full">
            You were offline for{" "}
            {Format.time(loadUpdate.lastDelta * 1000, {
              now: "",
              ago: "",
              never: "",
            })}
            . During this time, you gained:
          </div>
          {keys.map((res) => (
            <div className="full" key={res}>
              <ResourceRender
                resource={res}
                override={{ count: loadUpdate.lastChanges[res] }}
              />
            </div>
          ))}
          {remainder > 0 && (
            <div className="full center">... and {remainder} more ...</div>
          )}
        </>
      );
    },
  });

  context.resourceManager.onUpdateComplete = function (changes, dt, source) {
    if (source === "load" && dt >= 60 && Object.keys(changes).length > 0) {
      context.nuxManager.currentStates.OfflineSummary = { priority: 1000 };
    }
  };
}
