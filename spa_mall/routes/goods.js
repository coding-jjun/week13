// routes/goods.js

const express = require('express');
const router = express.Router();

// localhost:3000/api/ GET
router.get("/", (req, res) => {
    res.send("default url for goods.js GET Method");
});
  
// localhost:3000/api/about GET
router.get("/about", (req, res) => {
    res.send("goods.js about PATH");
});

const Goods = require("../schemas/goods");

router.get("/goods/cart", async (req, res) => {
    const carts = await Cart.find();
    const goodsIds = carts.map((cart) => cart.goodsId);
  
    const goods = await Goods.find({ goodsId: goodsIds });
  
    res.json({
        carts: carts.map((cart) => ({
            quantity: cart.quantity,
            goods: goods.find((item) => item.goodsId === cart.goodsId),
        })),
    });
});

router.post("/goods", async (req, res) => {
	const { goodsId, name, thumbnailUrl, category, price } = req.body;

  const goods = await Goods.find({ goodsId });
  if (goods.length) {
    return res.status(400).json({ success: false, errorMessage: "이미 있는 데이터입니다." });
  }

  const createdGoods = await Goods.create({ goodsId, name, thumbnailUrl, category, price });

  res.json({ goods: createdGoods });
});

const Cart = require("../schemas/cart");

router.post("/goods/:goodsId/cart", async (req, res) => {
    const { goodsId } = req.params;
    const { quantity } = req.body;

    const existsCarts = await Cart.find({ goodsId: Number(goodsId) });
    if (existsCarts.length) {
        return res.json({ success: false, errorMessage: "이미 장바구니에 존재하는 상품입니다." });
    }

    await Cart.create({ goodsId: Number(goodsId), quantity: quantity });

    res.json({ result: "success" });
});

router.put("/goods/:goodsId/cart", async (req, res) => {
    const { goodsId } = req.params;
    const { quantity } = req.body;
  
    if (quantity < 1) {
      res.status(400).json({ errorMessage: "수량은 1 이상이어야 합니다." });
      return;
    }
  
    const existsCarts = await Cart.find({ goodsId: Number(goodsId) });
    if (existsCarts.length) {
      await Cart.updateOne({ goodsId: Number(goodsId) }, { $set: { quantity } });
    }
  
    res.json({ success: true });
});

router.delete("/goods/:goodsId/cart", async (req, res) => {
    const { goodsId } = req.params;
  
    const existsCarts = await Cart.find({ goodsId });
    if (existsCarts.length > 0) {
      await Cart.deleteOne({ goodsId });
    }
  
    res.json({ result: "success" });
});

module.exports = router;