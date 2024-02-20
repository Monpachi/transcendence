import { useContext, useEffect, useState } from "react";
import { WsGameIdType } from "../../../../api/src/types/games/socketPayloadTypes";
import { SocketsContext } from "../../ContextsProviders/SocketsContext";
import { useIsUserAPlayer } from "./useIsUserAPlayer";
import { AppGame } from "../../../../api/src/types/games/returnTypes";
import { PLAYER_PING_INTERVAL } from "../../../../api/src/pong/gameLogic/constants";
import { ErrorContext } from "../../ContextsProviders/ErrorContext";

export const usePingServer = ({
  gameRecord,
}: {
  gameRecord: AppGame | undefined;
}) => {
  const { gameSocket } = useContext(SocketsContext);
  const { addError } = useContext(ErrorContext);
  const isUserAPlayer = useIsUserAPlayer({ gameRecord });
  const isOver = gameRecord?.winnerId;
  const [isDisconnected, setIsDisconnected] = useState(false);

  useEffect(() => {
    setIsDisconnected(false);
  }, [gameRecord?.id]);

  useEffect(() => {
    if (!isUserAPlayer || !gameRecord?.id || isOver) return;
    let timeoutId: NodeJS.Timeout | undefined = undefined;

    const intervalId = setInterval(() => {
      const payload: WsGameIdType = { gameId: gameRecord.id };
      gameSocket.emit("ping", payload);
      timeoutId = setTimeout(() => {
        if (!isDisconnected) {
          addError({ message: "You got disconnected from the game" });
        }
        setIsDisconnected(true);
      }, 500);
    }, PLAYER_PING_INTERVAL);

    const handlePong = (acknowledge: any) => {
      clearTimeout(timeoutId);
      acknowledge("client");
      setIsDisconnected(false);
    };

    gameSocket.on("pong", handlePong);
    return () => {
      gameSocket.off("pong", handlePong);
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [gameSocket, isDisconnected, isUserAPlayer, gameRecord?.id, isOver]);

  return isDisconnected;
};
