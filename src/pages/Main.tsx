import BuyButton from "../components/BuyButton";
import useGameContext from "../components/GameContext";
import ResourceRender from "../components/ResourceRender";
import { Context } from "../model/Context";
import { Resource } from "../model/Resource";

export default function Main() {
  const { resources } = useGameContext();
  const xRes = Object.values(resources)
    .filter((r) => r.name.startsWith("x_"))
    .sort(
      (a, b) => parseInt(a.name.substring(2)) - parseInt(b.name.substring(2)),
    );

  return (
    <div id="main">
      <div className="panel">
        <div className="title-bar">X</div>
        {xRes.map((res) => (
          <RenderDerivative key={res.name} resource={res} />
        ))}
        <hr className="separator" />
        <div className="three-quarters"></div>
        <div className="quarter">
          <BuyButton.BuyAllButton
            resources={xRes.slice(1)}
            showNames={false}
            overrideCount="manual"
          />
        </div>
        <div className="full right">
          Buy multiples: &nbsp;
          <BuyButton.BuyAmountButtons />
        </div>
      </div>
    </div>
  );
}

function RenderDerivative(props: { resource: Resource<Context> }) {
  if (!(props.resource.unlocked ?? true)) {
    return null;
  }

  return (
    <>
      <div className="half">
        <ResourceRender
          resource={props.resource}
          showExtras={true}
          showRate={true}
        />
      </div>
      <div className="quarter"></div>
      <div className="quarter">
        <BuyButton
          resource={props.resource}
          overrideCount={"manual"}
          overrideBuyAmount={props.resource.name === "x_0" ? "+1" : undefined}
          prefix={props.resource.name === "x_0" ? "" : "Buy"}
        />
      </div>
    </>
  );
}
