const SUPABASE_URL = "https://ppjjbtozmmziymdlszly.supabase.co";
const SUPABASE_KEY = "sb_publishable_wV0fgQkg6-9VrJB1ZPg9Vw_oNs6a8p7";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const list = document.querySelector("#product-list");
const count = document.querySelector("#pending-count");
const emptyMessage = document.querySelector("#empty-message");
const clearButton = document.querySelector("#clear-done");


const searchInput = document.querySelector("#product-search");
const catalogResults = document.querySelector("#catalog-results");
const catalogMessage = document.querySelector("#catalog-message");

const showAddProductButton = document.querySelector("#show-add-product");
const newProductForm = document.querySelector("#new-product-form");
const newProductName = document.querySelector("#new-product-name");
const newProductCategory = document.querySelector("#new-product-category");

const logoutButton = document.querySelector("#logout-button");

//inicio 
const authSection = document.querySelector("#auth-section");
const appContainer = document.querySelector("#app");
const loginForm = document.querySelector("#login-form");
const loginEmail = document.querySelector("#login-email");
const loginPassword = document.querySelector("#login-password");
//fin Añadir referencias en JavaScript


let catalog = [];


async function loadCatalog() {

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("active", true)
    .order("category")
    .order("name");

  if (error) {
    console.error("Error cargando catálogo:", error);
    return;
  }

  catalog = data;

  renderCatalog();

}

//función para cargar la lista de la compra desde Supabase
async function loadShoppingList() {

  const { data, error } = await supabaseClient
    .from("shopping_list")
    .select(`
      id,
      done,
      product_id,
      products (
        name,
        category,
        image_path
      )
    `)

  if (error) {
    console.error(
      "Error cargando lista:",
      error
    );
    return;
  }

  products = data.map(item => ({
    id: item.id,
    product_id: item.product_id,
    name: item.products?.name,
    category: item.products?.category,
    image_path: item.products?.image_path,
    done: item.done
  }));
  
  renderProducts();
}

//inicio modificación
function normalizeText(text) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
//fin modificación

//inicio modificación
//inicio modificación
function renderCatalog() {
  const query = normalizeText(searchInput.value);

  //filtro de productos por nombre o categoría
  const filteredProducts = catalog.filter(product => {
    const name = normalizeText(product.name);
    const category = normalizeText(
      product.category || "Otros"
    );

      return name.includes(query) || category.includes(query);
  });

  catalogResults.innerHTML = "";

  if (filteredProducts.length === 0) {
    catalogResults.innerHTML = `
      <tr>
        <td colspan="3">
          No se han encontrado productos.
        </td>
      </tr>
    `;
    return;
  }

  filteredProducts.forEach(product => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${product.name}</td>
      <td>${product.category}</td>
      <td>
        <button type="button" class="add-to-list-button">
          Añadir
        </button>

        <button type="button" class="edit-product-button">
          ✏️
        </button>

        <button type="button" class="delete-product-button">
          🗑️
        </button>
      </td>


    `;

    const addButton =
      row.querySelector(".add-to-list-button");

    const editButton =
      row.querySelector(".edit-product-button");

    const deleteButton =
      row.querySelector(".delete-product-button");
    
    //const addButton = row.querySelector("button");

    addButton.addEventListener("click", () => {
      addProductToShoppingList(product);
    });

    //inicio modificación borrar producto del catálogo
    deleteButton.addEventListener("click", async () => {

      const confirmed = confirm(
        `¿Eliminar "${product.name}" del catálogo?`
      );

      if (!confirmed) return;

      //inicio fallo si se intenta borrar un producto que está en la lista de la compra
      const { data: itemsInShoppingList, error: checkError } =
        await supabaseClient
          .from("shopping_list")
          .select("id")
          .eq("product_id", product.id);

      if (checkError) {
        console.error(checkError);
        alert("Error comprobando el producto.");
        return;
      }

      if (itemsInShoppingList.length > 0) {
        alert(
          `No puedes eliminar "${product.name}" porque está en la lista de la compra.`
        );
        return;
      }
      //fin fallo si se intenta borrar un producto que está en la lista de la compra


      const { error } = await supabaseClient
        .from("products")
        .delete()
        .eq("id", product.id);
      if (error) {
        console.error(error);
        alert("Error al eliminar el producto.");
        return;
      }
      await loadCatalog();
    });
    //fin modificación
    //inicio modificación editar producto del catálogo
    editButton.addEventListener("click", async () => {

      const newName = prompt(
        "Nombre del producto:",
        product.name
      );

      if (!newName) return;

      const newCategory = prompt(
        "Categoría:",
        product.category
      );

      if (!newCategory) return;

      const { error } = await supabaseClient
        .from("products")
        .update({
          name: newName.trim(),
          category: newCategory.trim()
        })
        .eq("id", product.id);
      
      if (error) {
        console.error(error);
          alert("Error al actualizar el producto.");
          return;
      }

      await loadCatalog();
    });
    //fin modificación

    catalogResults.appendChild(row);
  });
}


//fin modificación

searchInput.addEventListener("input", renderCatalog);


showAddProductButton.addEventListener("click", () => {
  newProductForm.hidden = !newProductForm.hidden;

  if (!newProductForm.hidden) {
    newProductName.focus();
  }
});

//variable para almacenar los productos de la lista de la compra
let products = [];

let currentFilter = "all";

function renderProducts() {
  list.replaceChildren();

  const visibleProducts = products.filter(product => {
    if (currentFilter === "pending") return !product.done;
    if (currentFilter === "done") return product.done;
    return true;
  });

  //inicio modificación para ordenar por categoría y luego por nombre
  let currentCategory = "";
  visibleProducts.sort((a, b) => {

    const categoryA = a.category || "";
    const categoryB = b.category || "";

    const categoryCompare =
      categoryA.localeCompare(categoryB);

    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    const nameA = a.name || "";
    const nameB = b.name || "";

    return nameA.localeCompare(nameB);
  });
  //fin modificación


  visibleProducts.forEach(product => {

    const productCategory = product.category || "Otros";

    if (productCategory !== currentCategory) {

      currentCategory = productCategory;

      const categoryHeader = document.createElement("li");
      categoryHeader.className = "category-header";
      categoryHeader.textContent = currentCategory.toUpperCase();

      list.append(categoryHeader);
    }


    const item = document.createElement("li");
    item.className = "product-item";

    if (product.done) item.classList.add("done");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = product.done;
    checkbox.setAttribute(
      "aria-label",
      `Marcar ${product.name} como comprado`
    );

    checkbox.addEventListener("change", async () => {

      const { error } = await supabaseClient
        .from("shopping_list")
        .update({
          done: checkbox.checked
        })
        .eq("id", product.id);

      if (error) {
        console.error(error);
        alert("Error actualizando el estado.");
        return;
      }

      await loadShoppingList();
    });
    
    const info = document.createElement("div");
    info.className = "product-info";

    const name = document.createElement("span");
    name.className = "product-name";
    name.textContent = product.name;

    const category = document.createElement("small");
    category.className = "product-category";
    category.textContent = 
      product.category || "Otros";

    info.append(name, category);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute(
      "aria-label",
      `Eliminar ${product.name}`
    );

    deleteButton.addEventListener(
      "click",
      async () => {

        const {error} = await supabaseClient
          .from("shopping_list")
          .delete()
          .eq("id", product.id);

        if (error) {
          console.error(error);
          alert("Error eliminando producto de la lista.");
          return;
        }

            await loadShoppingList();
      }
    );
    item.append(checkbox, info, deleteButton);
    list.append(item);  
  });

  const pending = products.filter(p => !p.done).length;

  count.textContent =
    `${pending} pendiente${pending === 1 ? "" : "s"}`;

  emptyMessage.hidden = visibleProducts.length > 0;

  emptyMessage.textContent = products.length === 0
    ? "Tu lista está vacía. ¡Añade el primer producto!"
    : "No hay productos en esta categoría.";

  clearButton.hidden = !products.some(p => p.done);
}

//función para añadir un producto a la lista de la compra
async function addProductToShoppingList(product) {
  const alreadyExists = products.some(
    item => item.product_id === product.id
  );

  if (alreadyExists) {
    alert(`${product.name} ya está en la lista.`);
    return;
  }

  const { error } = await supabaseClient
    .from("shopping_list")
    .insert([
      {
        product_id: product.id,
        done: false
      }
    ]);

  if (error) {
    console.error(error);
    alert("Error añadiendo producto a la lista.");
    return;
  }

  await loadShoppingList();
}
//fin modificación

function updateFilters() {
  document.querySelectorAll("[data-filter]").forEach(button => {
    const active = button.dataset.filter === currentFilter;

    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

document.querySelectorAll("[data-filter]").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    updateFilters();
    renderProducts();
  });
});

clearButton.addEventListener(
  "click", 
  async () => {
    const { error } = await supabaseClient
      .from("shopping_list")
      .delete()
      .eq("done", true);

    if (error) {
      console.error(error);
      alert("Error limpiando la lista.");
      return;
    }

    await loadShoppingList();
  }
);

//inicio modificación
newProductForm.addEventListener("submit", async event => {
  event.preventDefault();

  const name = newProductName.value.trim();
  const category = newProductCategory.value.trim() || "Otros";

  if (!name) return;

  const exists = catalog.some(
    product => normalizeText(product.name) === normalizeText(name)
  );

  if (exists) {
    alert("Este producto ya existe en el catálogo.");
    return;
  }

  const { error } = await supabaseClient
    .from("products")
    .insert([
      {
        name,
        category,
        image_path: null,
        active: true
      }
    ]);

  if (error) {
    console.error("Error creando producto:", error);
    alert("Error al guardar el producto.");
    return;
  }

  newProductForm.reset();
  newProductForm.hidden = true;

  searchInput.value = name;
  await loadCatalog();
});
//fin modificación

//arranque
checkSession();
//fin arranque

supabaseClient
  .channel("shopping-list")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "shopping_list"
    },
    async () => {
      await loadShoppingList();
    }
  )
  .subscribe();

supabaseClient
  .channel("products")
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "products"
    },
    async () => {
      await loadCatalog();
    }
  )
  .subscribe();

//inicio crear el login
loginForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    const email = loginEmail.value;
    const password = loginPassword.value;

    const { error } =
      await supabaseClient.auth
        .signInWithPassword({
          email,
          password
        });

    if (error) {
      alert("Usuario o contraseña incorrectos.");
      return;
    }

    checkSession();
  }
);
//fin crear el login
//inicio añadir función para comprobar la sesión
async function checkSession() {

  const {
    data: { session }
  } = await supabaseClient.auth.getSession();

  if (session) {

    authSection.hidden = true;
    appContainer.hidden = false;

    await loadCatalog();
    await loadShoppingList();

  } else {

    authSection.hidden = false;
    appContainer.hidden = true;
  }
}
//fin añadir función para comprobar la sesión

logoutButton.addEventListener(
  "click",
  async () => {

    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      console.error(error);
      return;
    }

    location.reload();
  }
);
  