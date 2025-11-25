/* script.js
   Full interactive behavior:
   - Signup form validation & storage
   - Cart (add/remove/clear/checkout) with localStorage
   - Sorting & filtering products
   - Product Details modal with Add-to-Cart
   - Cart sidebar open/close
   - Background image randomizer for sections (hero/offers/products/signup)
   - Smooth interactions and accessibility improvements
*/

document.addEventListener("DOMContentLoaded", () => {
  /* -------------------------
     Helper utilities
  ------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const formatRs = (n) => {
    // integer or float to Rs. formatted string
    return (
      "Rs. " +
      Number(n)
        .toLocaleString("en-PK", { maximumFractionDigits: 0 })
    );
  };

  /* -------------------------
     Elements
  ------------------------- */
  const addToCartButtons = $$(".add-to-cart");
  const productGrid = $("#productGrid");
  const cartSidebar = $("#cartSidebar");
  const cartList = $("#cartList");
  const cartTotalEl = $("#cartTotal");
  const checkoutBtn = $("#checkoutBtn");
  const clearCartBtn = $("#clearCartBtn");
  const signupForm = $("#signupForm");
  const signupMessage = $("#signupMessage");
  const signupBtn = $("#signupBtn");
  const callBtn = $("#callBtn");
  const emailBtn = $("#emailBtn");
  const joinNowBtn = $("#joinNowBtn");
  const sortSelect = $("#sortSelect");
  const filterSelect = $("#filterSelect");

  /* -------------------------
     Product dataset (derived from DOM + category map)
     We read DOM product nodes and build a JS product array with:
     {id, name, price, img, node, originalIndex, category}
  ------------------------- */
  const categoryMap = {
    1: "equipment", // Adjustable Dumbbells
    2: "supplements", // Whey Protein
    3: "accessories", // Yoga Mat
    4: "accessories", // Leather Gym Gloves
    5: "equipment", // Electric Treadmill
    6: "supplements", // Muscle Gain Combo
    7: "accessories", // Resistance Bands
    8: "accessories", // Shaker Bottle
    9: "equipment", // Bench Press Machine
    10: "equipment", // Kettlebell
    11: "accessories", // Skipping Rope
    12: "accessories" // Gym Towel
  };

  const products = $$(".product").map((node, i) => {
    const id = Number(node.dataset.id || i + 1);
    const name = node.dataset.name || $("h3", node).textContent.trim();
    const price = Number(node.dataset.price || (node.querySelector(".price") && node.querySelector(".price").textContent.replace(/[^\d]/g, "")) || 0);
    const imgEl = $("img", node);
    const img = imgEl ? imgEl.src : "";
    return {
      id,
      name,
      price,
      img,
      node,
      originalIndex: i,
      category: categoryMap[id] || "accessories",
    };
  });

  /* -------------------------
     Cart: object mapping id -> qty
     Persisted in localStorage under key 'gym_cart_v1'
  ------------------------- */
  let cart = JSON.parse(localStorage.getItem("gym_cart_v1") || "{}");

  function saveCart() {
    localStorage.setItem("gym_cart_v1", JSON.stringify(cart));
  }

  function cartItemCount() {
    return Object.values(cart).reduce((s, q) => s + q, 0);
  }

  function calculateCartTotal() {
    let total = 0;
    for (const idStr of Object.keys(cart)) {
      const id = Number(idStr);
      const p = products.find((x) => x.id === id);
      if (p) total += p.price * cart[idStr];
    }
    return total;
  }

  function renderCart() {
    cartList.innerHTML = "";
    const ids = Object.keys(cart).map((k) => Number(k));
    if (!ids.length) {
      cartList.innerHTML = `<p class="empty">Your cart is empty.</p>`;
      cartTotalEl.textContent = formatRs(0);
      cartSidebar.setAttribute("aria-hidden", "true");
      return;
    }

    const ul = document.createElement("ul");
    ul.className = "cart-items";
    ids.forEach((id) => {
      const p = products.find((x) => x.id === id);
      const qty = cart[id];
      const li = document.createElement("li");
      li.className = "cart-item";
      li.innerHTML = `
        <div class="cart-item-left">
          <img src="${p.img}" alt="${p.name}" style="width:64px;height:44px;object-fit:cover;border-radius:6px;margin-right:8px;">
          <div>
            <div class="cart-name">${p.name}</div>
            <div class="cart-qty">Qty: ${qty}</div>
          </div>
        </div>
        <div class="cart-item-right">
          <div class="cart-price">${formatRs(p.price * qty)}</div>
          <div class="cart-controls">
            <button class="btn small dec" data-id="${id}" aria-label="Decrease ${p.name}">-</button>
            <button class="btn small inc" data-id="${id}" aria-label="Increase ${p.name}">+</button>
            <button class="btn small remove" data-id="${id}" aria-label="Remove ${p.name}">Remove</button>
          </div>
        </div>
      `;
      ul.appendChild(li);
    });
    cartList.appendChild(ul);
    cartTotalEl.textContent = formatRs(calculateCartTotal());
    cartSidebar.setAttribute("aria-hidden", "false");
  }

  function openCart() {
    cartSidebar.classList.add("open");
    cartSidebar.setAttribute("aria-hidden", "false");
  }

  function closeCart() {
    cartSidebar.classList.remove("open");
    cartSidebar.setAttribute("aria-hidden", "true");
  }

  /* Handle item quantity changes from cart controls */
  cartList.addEventListener("click", (ev) => {
    const btn = ev.target.closest("button");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (!id) return;

    if (btn.classList.contains("inc")) {
      cart[id] = (cart[id] || 0) + 1;
      saveCart();
      renderCart();
    } else if (btn.classList.contains("dec")) {
      if (cart[id] > 1) cart[id] -= 1;
      else delete cart[id];
      saveCart();
      renderCart();
    } else if (btn.classList.contains("remove")) {
      delete cart[id];
      saveCart();
      renderCart();
    }
  });

  /* -------------------------
     Add-to-cart - from product cards
  ------------------------- */
  productGrid.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".add-to-cart");
    if (!btn) return;
    const productNode = ev.target.closest(".product");
    let id = null;
    if (productNode) id = Number(productNode.dataset.id);
    if (!id) {
      // try dataset on button
      id = Number(btn.dataset.id);
    }
    if (!id) return;

    cart[id] = (cart[id] || 0) + 1;
    saveCart();
    renderCart();
    openCart();
    // subtle toast
    showToast(`${products.find(p => p.id === id).name} added to cart`);
  });

  /* -------------------------
     Checkout & Clear Cart
  ------------------------- */
  checkoutBtn.addEventListener("click", () => {
    const ids = Object.keys(cart);
    if (!ids.length) {
      alert("Your cart is empty.");
      return;
    }
    // For demo: just simulate checkout
    const total = calculateCartTotal();
    if (!confirm(`Confirm purchase for ${formatRs(total)}?`)) return;
    // Clear cart and thank user
    cart = {};
    saveCart();
    renderCart();
    alert("Thank you! Your order has been received. Our team will contact you.");
  });

  clearCartBtn.addEventListener("click", () => {
    if (!Object.keys(cart).length) {
      showToast("Cart is already empty");
      return;
    }
    if (!confirm("Clear the cart?")) return;
    cart = {};
    saveCart();
    renderCart();
  });

  /* -------------------------
     Product Details Modal
  ------------------------- */
  let modal = null;
  function createModal() {
    modal = document.createElement("div");
    modal.className = "product-modal";
    modal.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal-content" role="dialog" aria-modal="true">
        <button class="modal-close btn outline" aria-label="Close details">Close</button>
        <div class="modal-body">
          <img src="" alt="" class="modal-img">
          <div class="modal-info">
            <h3 class="modal-title"></h3>
            <p class="modal-price"></p>
            <p class="modal-desc"></p>
            <div class="modal-actions">
              <button class="btn modal-add">Add to Cart</button>
              <button class="btn outline modal-close-2">Close</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // close handlers
    modal.querySelectorAll(".modal-close, .modal-close-2").forEach((b) => {
      b.addEventListener("click", closeModal);
    });
    modal.querySelector(".modal-backdrop").addEventListener("click", closeModal);
  }

  function openModalForProduct(prod) {
    if (!modal) createModal();
    const imgEl = modal.querySelector(".modal-img");
    const titleEl = modal.querySelector(".modal-title");
    const priceEl = modal.querySelector(".modal-price");
    const descEl = modal.querySelector(".modal-desc");
    const addBtn = modal.querySelector(".modal-add");

    imgEl.src = prod.img;
    imgEl.alt = prod.name;
    titleEl.textContent = prod.name;
    priceEl.textContent = formatRs(prod.price);
    descEl.textContent = `High quality ${prod.name}. Price shown is retail. Contact us for bulk discounts.`;

    addBtn.onclick = () => {
      cart[prod.id] = (cart[prod.id] || 0) + 1;
      saveCart();
      renderCart();
      showToast(`${prod.name} added to cart`);
      closeModal();
      openCart();
    };

    modal.classList.add("open");
    // focus management
    modal.querySelector(".modal-close").focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove("open");
  }

  // wire up details buttons
  productGrid.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".view-details");
    if (!btn) return;
    const productNode = ev.target.closest(".product");
    if (!productNode) return;
    const id = Number(productNode.dataset.id);
    const prod = products.find((p) => p.id === id);
    if (!prod) return;
    openModalForProduct(prod);
  });

  /* -------------------------
     Sorting & Filtering
  ------------------------- */
  function sortProducts(mode) {
    let sorted = [...products];
    if (mode === "priceLow") {
      sorted.sort((a, b) => a.price - b.price);
    } else if (mode === "priceHigh") {
      sorted.sort((a, b) => b.price - a.price);
    } else {
      // popular -> use originalIndex
      sorted.sort((a, b) => a.originalIndex - b.originalIndex);
    }
    // re-insert nodes in new order
    sorted.forEach((p) => {
      productGrid.appendChild(p.node);
    });
  }

  function filterProducts(category) {
    products.forEach((p) => {
      if (category === "all" || p.category === category) {
        p.node.style.display = "";
      } else {
        p.node.style.display = "none";
      }
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      sortProducts(e.target.value);
    });
  }
  if (filterSelect) {
    filterSelect.addEventListener("change", (e) => {
      filterProducts(e.target.value);
    });
  }

  /* -------------------------
     Signup form handling
  ------------------------- */
  signupForm.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const name = $("#fullName").value.trim();
    const email = $("#email").value.trim();
    const phone = $("#phone").value.trim();
    const pass = $("#password").value;
    const membership = $("#membershipPlan").value;
    const terms = $("#terms").checked;

    if (!name || !email || !pass || !terms) {
      signupMessage.textContent = "Please complete required fields and accept terms.";
      signupMessage.style.color = "#ffcc00";
      return;
    }

    // Basic email pattern
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      signupMessage.textContent = "Enter a valid email address.";
      signupMessage.style.color = "#ffcc00";
      return;
    }

    // Save to localStorage (demo only - DO NOT use for real secure storage)
    const users = JSON.parse(localStorage.getItem("gym_users_v1") || "[]");
    users.push({
      id: Date.now(),
      name,
      email,
      phone,
      membership,
      joinedAt: new Date().toISOString(),
    });
    localStorage.setItem("gym_users_v1", JSON.stringify(users));

    signupMessage.textContent = `Welcome ${name}! Signup successful.`;
    signupMessage.style.color = "#8ef38e";
    signupForm.reset();

    // optionally scroll to products or show offers
    setTimeout(() => {
      document.querySelector("#products").scrollIntoView({ behavior: "smooth" });
    }, 700);
  });

  /* -------------------------
     Header buttons
  ------------------------- */
  if (signupBtn) {
    signupBtn.addEventListener("click", () =>
      document.querySelector("#signup").scrollIntoView({ behavior: "smooth" })
    );
  }
  if (callBtn) {
    callBtn.addEventListener("click", () => {
      // show phone as alert for demo
      alert("Call us at +92-300-0000000");
    });
  }
  if (emailBtn) {
    emailBtn.addEventListener("click", () => {
      window.location.href = "mailto:fitnesscentre@gmail.com";
    });
  }
  if (joinNowBtn) {
    joinNowBtn.addEventListener("click", () =>
      document.querySelector("#signup").scrollIntoView({ behavior: "smooth" })
    );
  }

  /* -------------------------
     Product hover quick-preview (small)
     We'll show a subtle zoom handled via CSS; here we just ensure keyboard access
  ------------------------- */
  // allow Enter on product to open details
  products.forEach((p) => {
    p.node.tabIndex = 0;
    p.node.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        openModalForProduct(p);
      }
    });
  });

  /* -------------------------
     Background image randomizer (optional)
     We randomize hero/offers/products/signup backgrounds on load and every 12s
  ------------------------- */
  const hero = $(".hero");
  const offersSection = $(".offers");
  const productsSection = $(".products");
  const signupSection = $(".signup");

  const bgSets = {
    hero: [
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=1400&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1534367611697-7a0de2f0f7d9?w=1400&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1554284126-aa88f22d8d7e?w=1400&q=80&auto=format&fit=crop",
    ],
    offers: [
      "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=1300&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=1300&q=80&auto=format&fit=crop",
    ],
    products: [
      "https://images.unsplash.com/photo-1600185365483-26d7f220b33b?w=1300&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1598971639058-5d9e04f0f32e?w=1300&q=80&auto=format&fit=crop",
    ],
    signup: [
      "https://images.unsplash.com/photo-1514995428455-447d4443fa7f?w=1300&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1517964603305-090973c0f6bf?w=1300&q=80&auto=format&fit=crop",
    ],
  };

  function setRandomBackground(sectionEl, urls) {
    if (!sectionEl) return;
    const idx = Math.floor(Math.random() * urls.length);
    sectionEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.55)), url("${urls[idx]}")`;
    sectionEl.style.backgroundSize = "cover";
    sectionEl.style.backgroundPosition = "center";
  }

  // initial set
  setRandomBackground(hero, bgSets.hero);
  setRandomBackground(offersSection, bgSets.offers);
  setRandomBackground(productsSection, bgSets.products);
  setRandomBackground(signupSection, bgSets.signup);

  // rotate every 12 seconds (gentle)
  setInterval(() => {
    setRandomBackground(hero, bgSets.hero);
    setRandomBackground(offersSection, bgSets.offers);
    setRandomBackground(productsSection, bgSets.products);
    setRandomBackground(signupSection, bgSets.signup);
  }, 12000);

  /* -------------------------
     Small toast helper
  ------------------------- */
  let toastTimer = null;
  function showToast(msg) {
    let toast = document.getElementById("siteToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "siteToast";
      toast.style.position = "fixed";
      toast.style.left = "50%";
      toast.style.bottom = "40px";
      toast.style.transform = "translateX(-50%)";
      toast.style.background = "rgba(0,0,0,0.85)";
      toast.style.color = "#fff";
      toast.style.padding = "10px 16px";
      toast.style.borderRadius = "8px";
      toast.style.boxShadow = "0 6px 20px rgba(0,0,0,0.6)";
      toast.style.zIndex = 9999;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = 1;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.style.transition = "opacity 500ms";
      toast.style.opacity = 0;
    }, 2200);
  }

  /* -------------------------
     Initialize UI state
  ------------------------- */
  renderCart();
  // set startup sort/filter if selects exist
  if (sortSelect) sortSelect.value = "popular";
  if (filterSelect) filterSelect.value = "all";

  // trap Escape to close modal & cart
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape") {
      if (modal && modal.classList.contains("open")) closeModal();
      if (cartSidebar.classList.contains("open")) closeCart();
    }
  });

  // close cart when clicking outside on small screens
  document.addEventListener("click", (ev) => {
    if (!cartSidebar.classList.contains("open")) return;
    const inside = ev.target.closest(".cart");
    const openBtn = ev.target.closest(".add-to-cart");
    if (!inside && !openBtn) closeCart();
  });

  /* Accessibility improvements: add aria labels where useful */
  cartSidebar.setAttribute("role", "complementary");
  products.forEach((p) => p.node.setAttribute("role", "article"));

  /* End DOMContentLoaded */
});
