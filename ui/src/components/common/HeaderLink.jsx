import React from "react";
import { Link, useLocation } from "react-router-dom";
import { apply, tw } from "twind";

export function HeaderLink({ to, ...props }) {
  const location = useLocation();
  // const isCurrent = location.pathname == to;
  return (
    <Link
      to={to}
      className={tw(
        apply`text-xl hover:(underline-none text-white) focus:(text-white) active:(text-white)`,
        // isCurrent && `underline`
      )}
      {...props} />
  );
}
