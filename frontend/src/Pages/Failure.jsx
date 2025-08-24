import React from "react";

function Failure() {
  const searchData = new URLSearchParams(window.location.search);
  const message = searchData.get("message");
  return <div>Payment failure {message}</div>;
}

export default Failure;
