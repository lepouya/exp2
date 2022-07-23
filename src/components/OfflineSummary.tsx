import { Context } from "../model/Context";
import Format from "../utils/format";
import ResourceRender from "./ResourceRender";

export default function registerOfflineSummary(context: Context) {
  context.nuxManager.register({
    name: "OfflineSummary",
    title: "While you were offline...",
    body(_, manager) {
      const rm = manager.context.resourceManager;
      const loadUpdate = rm.execution.load;
      if (!loadUpdate) {
        return null;
      } else if (Object.keys(loadUpdate.lastChanges).length === 0) {
        return <div className="full">Nothing happened!</div>;
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
          {Object.keys(loadUpdate.lastChanges).map((res) => (
            <div className="full" key={res}>
              <ResourceRender
                resource={res}
                override={{ count: loadUpdate.lastChanges[res] }}
              />
            </div>
          ))}
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
