import { useEffect, useState } from "react";

import Game from "./Game";
import useGameContext from "./GameContext";
import Reset from "./Reset";
import Spinner from "./Spinner";

export default function Loader() {
  const context = useGameContext();
  const [isLoaded, setLoaded] = useState(false);
  const [isFailed, setFailed] = useState(false);

  useEffect(() => {
    if (!isLoaded && !isFailed) {
      setTimeout(initialize, 1000.0 / context.settings.ticksPerSecond);
    }
  }, [isLoaded, isFailed]);

  function initialize() {
    try {
      context.init();
      context.load();
      setLoaded(true);
    } catch (ex) {
      setFailed(true);
      throw ex;
    }
  }

  if (isLoaded) {
    return <Game />;
  } else if (isFailed) {
    return <Reset />;
  } else {
    return <Spinner />;
  }
}
