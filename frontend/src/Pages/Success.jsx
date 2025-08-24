import React from "react";
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../contexts/AuthContext";
function Success() {
  return <div>Payment successful</div>;
}

export default Success;
