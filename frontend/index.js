const apiBaseURL = 'http://localhost:1337/api';

// Helper function to get authorization headers
const getAuthHeaders = () => {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// API call function
const apiCall = async (method, url, data = null, requiresAuth = true) => {
  try {
    const headers = requiresAuth ? getAuthHeaders() : {};
    const response = await axios({
      method: method,
      url: `${apiBaseURL}${url}`,
      headers: headers,
      data: data
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to ${method} ${url}:`, error.response?.data || error.message);
    throw error;
  }
};

const loginBtn = document.querySelector("#login-btn");
const user = document.querySelector("#user-login");
const password = document.querySelector("#user-password");

const registerBtn = document.querySelector("#register-btn");
const registerUser = document.querySelector("#username-register");
const registerEmail = document.querySelector("#email-register");
const registerPassword = document.querySelector("#password-register");

const logoutBtn = document.querySelector("#logout-btn");

const login = async () => {
  try {
    const response = await apiCall('post', '/auth/local', {
      identifier: user.value,
      password: password.value,
    }, false);// requiresAuth = false
    console.log('user profile', response.user);
    sessionStorage.setItem("token", response.jwt);
    sessionStorage.setItem("user", JSON.stringify(response.user));
    await renderPage();
  } catch (error) {
    console.log("Error:", error.response);
    if (error.response && error.response.data && error.response.data.message) {
      alert(`Login failed: ${error.response.data.message[0].messages[0].message}`);
    } else {
      alert("Login failed");
    }
  }
};

const register = async () => {
  try {
    const response = await apiCall('post', '/auth/local/register', {
      username: registerUser.value,
      email: registerEmail.value,
      password: registerPassword.value,
    }, false);  // requiresAuth = false
    console.log("Registered:", response);
    if (response.statusText === "OK") {
      alert("You have been registered. Please log in!");
      console.log("Registered!");
    }
  } catch (error) {
    console.error("Registration failed:", error.response);
    alert("Registration failed. Try again!");
  }
};

const logout = () => {
  sessionStorage.clear();
  renderPage();
};

loginBtn.addEventListener("click", login);
registerBtn.addEventListener("click", register);
logoutBtn.addEventListener("click", logout);

const checkIfLoggedIn = async () => {
  const token = sessionStorage.getItem("token");
  if (!token) return false;
  try {
    await apiCall('get', '/users/me');
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

const getLoggedInUser = async () => {
  const token = sessionStorage.getItem("token");
  if (!token) return null;

  try {
    const user = await apiCall('get', '/users/me?populate=*');
    console.log("LOGGED IN USER:", user);
    return user;
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return null;
  }
};


const renderPage = async () => {
  let user = await getLoggedInUser();
  if (user) {
    document.querySelector("#login-wrapper").style.display = "none";
    document.querySelector("#welcome-page").style.display = "block";
    document.querySelector("#welcome-page h1").innerText = `Welcome, ${user.username} !`;
    await getRatings();
    await displayUserBooks();
    await displayAllBooks();
  } else {
    document.querySelector("#login-wrapper").style.display = "flex";
    document.querySelector("#welcome-page").style.display = "none";
  }
};


//*_________Books____________

const fetchBooks = async () => {
  try {
    const response = await apiCall('get', '/books?populate=*', null, false);
    console.log("BOOKS:", response);
    return response.data.map(book => {
      const ratings = book.attributes.ratings?.data || [];
      const totalScore = ratings.reduce((sum, rating) => sum + rating.attributes.value, 0);
      const averageRating = ratings.length > 0 ? (totalScore / ratings.length).toFixed(2) : "No Score";
      return {
        id: book.id,
        title: book.attributes.title,
        author: book.attributes.author,
        pages: book.attributes.pages,
        releaseDate: book.attributes.releaseDate,
        averageRating: averageRating,
        image: book.attributes.image.data ? book.attributes.image.data.attributes.formats.small.url : null
      };
    });
  } catch (error) {
    console.error("Failed to fetch books:", error);
    return [];
  }
};

const createBookCards = (books, container) => {
  const ratings = JSON.parse(sessionStorage.getItem("ratings")) || [];

  books.forEach(book => {
    const bookCard = document.createElement("div");
    bookCard.className = "book-card";
    bookCard.id = `${book.id}`;

    const userRating = ratings.find(rating => rating.attributes.book.data.id === book.id);
    const userRatingValue = userRating ? userRating.attributes.value : null;

    bookCard.innerHTML = `
      <img src="//localhost:1337${book.image}" alt="${book.title}" class="book-image">
      <div class="book-details">
        <h3>${book.title}</h3>
        <p>Author: ${book.author}</p>
        <p>Pages: ${book.pages}</p>
        <p>Release Date: ${new Date(book.releaseDate).toDateString()}</p>
        <p class="average-rating">Average rating: ${book.averageRating}</p>
        <div class="rating">
          <span class="star-rating">
            ${[1, 2, 3, 4, 5].map(i => `
              <label for="rate-${book.id}-${i}" style="--i:${i}"><i class="fa-solid fa-star"></i></label>
              <input type="radio" name="rating-${book.id}" id="rate-${book.id}-${i}" value="${i}" ${userRatingValue === i ? 'checked' : ''}>
            `).join('')}
          </span>
        </div>
        <button class="read-btn"><i class="fa-solid fa-book-open-reader"> Read it</i></button>
      </div>
    `;
    container.append(bookCard);

    const ratingInputs = bookCard.querySelectorAll(`input[name="rating-${book.id}"]`);
    ratingInputs.forEach(input => {
      input.addEventListener('change', function () {
        rateBook(book.id, this.value);
      });
    });

    const readBtn = bookCard.querySelector(".read-btn");
    readBtn.addEventListener("click", function () {
      addToReadingList(book.id);
    });
  });
};
const createBookList = (books, container) => {
  container.innerHTML = ''; 

  const bookList = document.createElement("ul");

  books.forEach(book => {
    const bookItem = document.createElement("li");
    bookItem.className = "book-item";
    bookItem.id = `${book.id}-list`;

    const ratings = getRatingsFromSession();
    const userRating = ratings.find(rating => rating.attributes.book.data.id === book.id);
    const userRatingValue = userRating ? userRating.attributes.value : "Not rated";

    bookItem.innerHTML = `
      <div class="book-details">
        <h4>${book.title}</h4>
        <p>Author: ${book.author}</p>
        <p>My Rating: ${userRatingValue}</p>
        <button class="read-btn"><i class="fa-regular fa-trash-can">Remove</i></button>
      </div>
    `;
    bookList.append(bookItem);

    const readBtn = bookItem.querySelector(".read-btn");
    readBtn.addEventListener("click", function () {
      addToReadingList(book.id);
    });
  });

  container.append(bookList);
};

const renderBooks = (books) => {
  const readBooksContainer = document.querySelector("#to-read-container");
  readBooksContainer.innerHTML = "";
  createBookList(books, readBooksContainer);
  console.log("Books rendered:", books);
};

const displayAllBooks = async () => {
  const books = await fetchBooks();
  const booksContainer = document.querySelector("#books-container");
  booksContainer.innerHTML = ""; 
  createBookCards(books, booksContainer);
}; 


let addToReadingList = async (bookId) => {  
  const storedUser = sessionStorage.getItem("user");
  const token = sessionStorage.getItem("token");

  if (!storedUser || !token) {
    alert("Please log in to add books to your reading list.");
    return;
  }

  let user = JSON.parse(storedUser);
  let userAndBooks = await getLoggedInUser(user.id);
  
  if (userAndBooks && userAndBooks.books) {
    let books = userAndBooks.books.map(book => book.id);
    let operation = books.includes(bookId) ? 'disconnect' : 'connect';

    try {
      let response = await axios.put(`http://localhost:1337/api/users/${user.id}`, {
        books: {
          [operation]: [bookId]
        },
      }, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
       
      console.log("Update reading list:", response);
      displayUserBooks();
      alert(`The book has ${operation === 'connect' ? 'added to' : 'taken off'} your reading list!`);

    } catch (error) {
      console.error("Failed to add book to reading list:", error);

      alert("Failed to add book to reading list. Please try again.");
    } 
  } else {
    alert("Could not retrieve user information. Please check your connection and try again.");
  }
};

let displayUserBooks = async () => {
  const user = await getLoggedInUser();
  
  if (user && user.books) {
    const books = user.books;
    renderBooks(books);
  } else {
    console.log("No books were found for the user");
  }
};

let sortBooksByAuthor = async () => {
  const user = await getLoggedInUser();
  if (user && user.books) {
    const books = user.books;

    books.sort((a, b) => {
      let authorA = a.author.toLowerCase();
      let authorB = b.author.toLowerCase();
      if (authorA < authorB) return -1;
      if (authorA > authorB) return 1;
      return 0;
    });

    renderBooks(books);
  } else {
    console.log("No books were found for the user");
  }
};

let sortBooksByTitle = async () => {
  const user = await getLoggedInUser();
  if (user && user.books) {
    const books = user.books;

    books.sort((a, b) => {
      let titleA = a.title.toLowerCase();
      let titleB = b.title.toLowerCase();
      if (titleA < titleB) return -1;
      if (titleA > titleB) return 1;
      return 0;
    });

    renderBooks(books);
  } else {
    console.log("No books were found for the user");
  }
};

const sortBooksByUserRating = async () => {
  const user = await getLoggedInUser();
  if (!user || !user.id) {
    console.log("No user logged in or user data is not available");
    return;
  }

  if (!user.books || user.books.length === 0) {
    console.log("No books were found for the user");
    return;
  }

  // Get user's ratings
  const ratings = getRatingsFromSession();

  // Map ratings to books
  const booksWithRatings = user.books.map(book => {
    const userRating = ratings.find(rating => rating.attributes.book.data.id === book.id);
    return {
      ...book,
      userRatingValue: userRating ? userRating.attributes.value : 0
    };
  });

  // Sort books based on user ratings (highest to lowest)
  booksWithRatings.sort((a, b) => b.userRatingValue - a.userRatingValue);

  // Render sorted books
  renderBooks(booksWithRatings);
};

//*_____________Rating__________________
const getRatings = async () => {
  try {
    const user = await getLoggedInUser();
    if (!user || !user.id) {
      console.error("No user logged in.");
      return;
    }
    // Strapi's filters för att utföra en filtrering av data på servern innan den returneras till klienten
    // $eq: Detta är en operatör som står för "equal to" (likamed). Det används för att specificera att vi vill matcha exakt på ett visst värde, i detta fall user.id.
    // populate=book: En parameter som används för att specificera att vi också vill inkludera relaterade book-data i vårt svar.
    const response = await apiCall('get', `/ratings?filters[user][id][$eq]=${user.id}&populate=book`);
    console.log("RATINGS", response.data);
    sessionStorage.setItem("ratings", JSON.stringify(response.data));
  } catch (error) {
    console.error("Failed to fetch ratings:", error);
  }
};
// Function to get ratings from sessionStorage
const getRatingsFromSession = () => {
  return JSON.parse(sessionStorage.getItem("ratings")) || [];
};

const rateBook = async (bookId, value) => {
  const user = await getLoggedInUser();
  if (!user || !user.id) {
    alert("Please log in to rate books.");
    return;
  }

  try {
    // Check if the user has already rated the book
    const response = await apiCall('get', `/ratings?filters[user][id][$eq]=${user.id}&filters[book][id][$eq]=${bookId}`);
    const existingRating = response.data[0];

    if (existingRating) {
      // Update existing rating
      await apiCall('put', `/ratings/${existingRating.id}`, {
        data: { value: value },
      });
      console.log("Rating updated successfully");
    } else {
      // Create new rating
      await apiCall('post', '/ratings', {
        data: {
          value: value,
          user: { connect: [user.id] },
          book: { connect: [bookId] },
        },
      });
      console.log("Rating created successfully");
    }
  } catch (error) {
    console.error("Failed to do a rating:", error.response?.data || error.message);
  }
};

//* Event listeners for sort buttons
document.getElementById('sort-author-btn').addEventListener('click', sortBooksByAuthor);
document.getElementById('sort-title-btn').addEventListener('click', sortBooksByTitle);
document.getElementById('sort-rating-btn').addEventListener('click', sortBooksByUserRating);

document.addEventListener('DOMContentLoaded', async () => {
  await fetchTheme();
  await getRatings();
  await renderPage();
  await displayAllBooks();
});

//*___________Theme__________

const fetchTheme = async () => {
  try {
    const response = await apiCall('get', '/display');
    const themeName = response.data.attributes.theme;
    console.log("THEME: ", themeName);
    document.body.className = themeName;
  } catch (error) {
    console.error('Failed to fetch theme:', error);
  }
};                                                                             