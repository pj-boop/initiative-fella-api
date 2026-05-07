import mongoose from "mongoose";

const validateObjectId = (paramName, message = "Invalid id") => {
  return (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params[paramName])) {
      return res.status(400).json({ message });
    }

    return next();
  };
};

export default validateObjectId;
