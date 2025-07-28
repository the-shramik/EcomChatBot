import React, { useContext, useState, useEffect } from "react";
import AppContext from "../Context/Context";
import axios from "axios";
import CheckoutPopup from "./CheckoutPopup";
import { Button } from 'react-bootstrap';

const Cart = () => {
  const { cart, removeFromCart, clearCart } = useContext(AppContext);
  const [cartItems, setCartItems] = useState([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [cartImageMap, setCartImageMap] = useState({});
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchImagesAndUpdateCart = async () => {
      try {
        const response = await axios.get("http://localhost:8080/api/products");
        const backendProductIds = response.data.map((product) => product.id);

        const updatedCartItems = cart.filter((item) => backendProductIds.includes(item.id));
        const imageMap = {};

        const cartItemsWithImages = await Promise.all(
          updatedCartItems.map(async (item) => {
            try {
              const response = await axios.get(
                `http://localhost:8080/api/product/${item.id}/image`,
                { responseType: "blob" }
              );
              const imageFile = new File([response.data], "product.jpg", { type: response.data.type });
              imageMap[item.id] = imageFile;
              const imageUrl = URL.createObjectURL(response.data);
              return { ...item, imageUrl };
            } catch (error) {
              console.error("Image fetch failed:", error);
              return { ...item, imageUrl: "placeholder-image-url" };
            }
          })
        );

        setCartImageMap(imageMap);
        setCartItems(cartItemsWithImages);
      } catch (error) {
        console.error("Product fetch failed:", error);
      }
    };

    if (cart.length) fetchImagesAndUpdateCart();
  }, [cart]);

  useEffect(() => {
    const total = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    setTotalPrice(total);
  }, [cartItems]);

  const handleIncreaseQuantity = (itemId) => {
    const newCartItems = cartItems.map((item) =>
      item.id === itemId
        ? item.quantity < item.stockQuantity
          ? { ...item, quantity: item.quantity + 1 }
          : (alert("Cannot add more than available stock"), item)
        : item
    );
    setCartItems(newCartItems);
  };

  const handleDecreaseQuantity = (itemId) => {
    const newCartItems = cartItems.map((item) =>
      item.id === itemId
        ? { ...item, quantity: Math.max(item.quantity - 1, 1) }
        : item
    );
    setCartItems(newCartItems);
  };

  const handleRemoveFromCart = (itemId) => {
    removeFromCart(itemId);
    const newCartItems = cartItems.filter((item) => item.id !== itemId);
    setCartItems(newCartItems);
  };

  const handleCheckout = async () => {
    try {
      for (const item of cartItems) {
        const imageFile = cartImageMap[item.id];
        const updatedStock = item.stockQuantity - item.quantity;
        const productData = {
          ...item,
          stockQuantity: updatedStock,
        };

        const formData = new FormData();
        if (imageFile) {
          formData.append("imageFile", imageFile);
        }
        formData.append(
          "product",
          new Blob([JSON.stringify(productData)], {
            type: "application/json",
          })
        );

        await axios.put(`http://localhost:8080/api/product/${item.id}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      clearCart();
      setCartItems([]);
      setShowModal(false);
    } catch (error) {
      console.error("Checkout failed:", error);
    }
  };

  return (
    <div className="cart-container">
      <div className="shopping-cart">
        <div className="title">Shopping Bag</div>
        {cartItems.length === 0 ? (
          <div className="empty" style={{ textAlign: "left", padding: "2rem" }}>
            <h4>Your cart is empty</h4>
          </div>
        ) : (
          <>
            {cartItems.map((item) => (
              <li key={item.id} className="cart-item">
                <div className="item" style={{ display: "flex", alignItems: "center" }}>
                  <img src={item.imageUrl} alt={item.name} className="cart-item-image" />
                  <div className="description">
                    <span>{item.brand}</span>
                    <span>{item.name}</span>
                  </div>
                  <div className="quantity">
                    <button onClick={() => handleIncreaseQuantity(item.id)}>
                      <i className="bi bi-plus-square-fill"></i>
                    </button>
                    <input type="text" readOnly value={item.quantity} />
                    <button onClick={() => handleDecreaseQuantity(item.id)}>
                      <i className="bi bi-dash-square-fill"></i>
                    </button>
                  </div>
                  <div className="total-price">${item.price * item.quantity}</div>
                  <button onClick={() => handleRemoveFromCart(item.id)}>
                    <i className="bi bi-trash3-fill"></i>
                  </button>
                </div>
              </li>
            ))}
            <div className="total">Total: ${totalPrice}</div>
            <Button style={{ width: "100%" }} onClick={() => setShowModal(true)}>
              Checkout
            </Button>
          </>
        )}
      </div>
      <CheckoutPopup
        show={showModal}
        handleClose={() => setShowModal(false)}
        cartItems={cartItems}
        totalPrice={totalPrice}
        handleCheckout={handleCheckout}
      />
    </div>
  );
};

export default Cart;
