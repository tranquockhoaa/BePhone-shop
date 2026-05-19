const ChatService = require("../service/chatService.js");
const catchAsync = require("./../utils/catchAsync");

exports.sendMessage = catchAsync(async (req, res, next) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      status: "error",
      message: "Message is required",
    });
  }

  const response = await ChatService.processMessage(message);

  res.status(200).json({
    status: "success",
    data: {
      response,
    },
  });
});
