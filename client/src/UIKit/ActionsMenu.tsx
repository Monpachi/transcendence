import { MoreVert } from "@mui/icons-material";
import { useEffect, useRef, useState } from "react";

export type MenuActionType = {
  label: string;
  onClick: () => any | void;
  color?: "red" | "base";
  icon?: any;
};

export const ActionsMenu = ({ actions }: { actions: MenuActionType[] }) => {
  const [show, setShow] = useState(false);
  const menuButtonRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const colorVariants = {
    base: "hover:bg-indigo-500",
    red: "hover:bg-red-500 text-red-500 hover:text-white",
  };

  useEffect(() => {
    if (show && menuButtonRef.current) {
      const handleMouseUp = (e: MouseEvent) => {
        const element = e.target as HTMLElement;
        if (
          menuButtonRef.current &&
          menuRef.current &&
          !menuButtonRef.current.contains(element) &&
          !menuRef.current.contains(element)
        ) {
          setShow(false);
        }
      };

      addEventListener("mouseup", handleMouseUp);
      return () => removeEventListener("mouseup", handleMouseUp);
    }
  }, [show]);

  if (!actions.length) {
    return null;
  }

  return (
    <div className="relative">
      <div
        ref={menuButtonRef}
        onClick={() => {
          setShow(!show);
        }}
        className="cursor-pointer opacity-75 hover:opacity-100"
      >
        <MoreVert />
      </div>

      {show && (
        <div
          ref={menuRef}
          className="animate-fadein absolute z-10 top-[25px] right-[25px] shadow-md"
        >
          <div className="animate-scalein origin-top-right min-w-56 bg-bg-2 p-2 rounded-md flex flex-col gap-[2px]">
            {actions.map((action, i) => {
              return (
                <div
                  key={i}
                  onClick={() => {
                    setShow(false);
                    action.onClick();
                  }}
                  className={`flex justify-between items-center cursor-pointer rounded-sm px-2 py-1 ${
                    colorVariants[action.color ?? "base"]
                  }`}
                >
                  <span className="whitespace-nowrap">{action.label}</span>
                  {action.icon}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};