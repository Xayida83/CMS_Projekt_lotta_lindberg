const loginBtn = document.querySelector("#login-btn");
const user = document.querySelector("#user-login");
const password = document.querySelector("#user-password");

const registerBtn = document.querySelector("#register-btn");
const registerUser = document.querySelector("#username-register");
const registerEmail = document.querySelector("#email-register");
const registerPassword = document.querySelector("#password-register");

const logoutBtn = document.querySelector("#logout-btn");

let login = async () => {
  try {
    axios.post('http://localhost:1337/api/auth/local', {
  identifier: user.value,
  password: password.value,
})
.then(response => {
  console.log('user profile', response.data.user);
  
  sessionStorage.setItem("token", response.data.jwt);
  sessionStorage.setItem("user", JSON.stringify(response.data.user));
 
  renderPage();
})
  } catch (error) {
    console.log("Error:", error.response)
  }
}

let register = async () => {
  try {
    let response = await axios.post('http://localhost:1337/api/auth/local/register', {
      username: registerUser.value,
      email: registerEmail.value,
      password: registerPassword.value,
    });
    console.log("Registered:", response);
    if (response.statusText = "OK") {
      alert("You have been registered. Please log in!")
      console.log("Registered!")
    } 
  } catch (error) {
    console.error("Registration failed:", error.response);
    alert("Registration failed. Try again!")
  }
}

let logout = () => {
  sessionStorage.clear();
  renderPage();
};

loginBtn.addEventListener("click", login);
registerBtn.addEventListener("click", register);
logoutBtn.addEventListener("click", logout);


let checkIfLoggedIn = async () => {
  const token = sessionStorage.getItem("token");
  if (!token) return false;
  try {
    await axios.get("http://localhost:1337/api/users/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

 let getLoggedInUser = async () => {
  try {
    let response = await axios.get("http://localhost:1337/api/users/me?populate=*", {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
    });
    console.log("LOGGED IN", response.data)
    return response.data; 
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return null; 
  }
}

let renderPage = async () => {
  let isLoggedIn = await checkIfLoggedIn(); 
  if (isLoggedIn) {
    document.querySelector("#login-wrapper").style.display = "none";
    document.querySelector("#welcome-page").style.display = "block";
    document.querySelector("#welcome-page h2").innerText = `Welcome, ${
      JSON.parse(sessionStorage.getItem("user")).username
    } !`;
      getRatings();
      displayUserBooks();

  } else {
    document.querySelector("#login-wrapper").style.display = "flex";
    document.querySelector("#welcome-page").style.display = "none";
  }
};


//*_________Books____________

let fetchBooks = async () => {
  try {
    const response = await axios.get('http://localhost:1337/api/books?populate=*');
    console.log("BOOKS:", response.data);
    const books = response.data.data.map(book => {
      const ratings = book.attributes.ratings.data;
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
    console.log(books);
    return books;
  } catch (error) {
    console.error("Failed to fetch books:", error);
    return [];
  }
};

// let fetchBooks = async () => {
//   try {
//     const response = await axios.get('http://localhost:1337/api/books?populate=*');
//     const books = response.data.data.map(book => ({
//       id: book.id,
//       title: book.attributes.title,
//       author: book.attributes.author,
//       pages: book.attributes.pages,
//       releaseDate: book.attributes.releaseDate,
//       totalScore: book.attributes.totalScore,
//       ratingCount: book.attributes.ratingCount,
//       image: book.attributes.image.data ? book.attributes.image.data.attributes.formats.small.url : null
//     }));
//     console.log(books);
//     return books;
//   } catch (error) {
//     console.error("Failed to fetch books:", error);
//     return [];
//   }  
// };

let createBookCards = (books, container) => {
  const ratings = JSON.parse(sessionStorage.getItem("ratings")) || [];

  books.forEach(book => {
    const bookCard = document.createElement("div");
    bookCard.className = "book-card"; 
    bookCard.id=`${book.id}`

      // Kontrollera om användaren har gett ett betyg på boken
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
      input.addEventListener('change', function() {
        rateBook(book.id, this.value);
      });
    });    

    const readBtn = bookCard.querySelector(".read-btn");
    readBtn.addEventListener("click", function() {
      addToReadingList(book.id);
    });
  });
};
let createBookList = (books, container) => {
  container.innerHTML = ''; // Töm behållaren innan du lägger till böckerna
  
  books.forEach(book => {
    const bookItem = document.createElement("ul");
    bookItem.className = "book-item"; 
    bookItem.id = `${book.id}-list`;

    bookItem.innerHTML = `
      <li class="book-details">
        <h4>Title: ${book.title}</h3>
        <p>Author: ${book.author}</p>
        <button class="read-btn">Remove</button>
      </li>
    `;
    container.append(bookItem);

    const readBtn = bookItem.querySelector(".read-btn");
    readBtn.addEventListener("click", function() {
      addToReadingList(book.id);
    });
  });
};

let renderBooks = (books) => {
  const readBooksContainer = document.querySelector("#to-read-container");
  readBooksContainer.innerHTML = "";
  createBookList(books, readBooksContainer)
  console.log("Books rendered:", books);
};

let displayAllBooks = async () => {
  const books = await fetchBooks();
  const booksContainer = document.querySelector("#books-container");
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

    // Sortera böckerna efter författarens namn
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

    // Sortera böckerna efter titel
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

//*_____________Rating__________________
let getRatings = async () => {
  const user = await getLoggedInUser();
  if (!user || !user.id) {
    console.error("No user logged in.", error);
    return;
  } 

  try {
    let response = await axios.get(`http://localhost:1337/api/ratings?filters[user][id][$eq]=${user.id}&populate=book`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
    });

    console.log("RATINGS", response.data.data)
    const ratings = response.data.data;
    sessionStorage.setItem("ratings", JSON.stringify(ratings));

  } catch (error) {
    console.error("Failed to fetch ratings:", error);
    return null; 
  }
}


let rateBook = async (bookId, value) => {
  const user = await getLoggedInUser();

  if (!user || !user.id) {
    alert("Please log in to rate books.");
    return;
  }

  console.log("HERE", "user:", user.id, "book:", bookId, "value:", value);

  try {
    // Kontrollera om användaren redan har betygsatt boken
    let response = await axios.get(`http://localhost:1337/api/ratings?filters[user][id][$eq]=${user.id}&filters[book][id][$eq]=${bookId}`, {
      headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      },
    });

    const existingRating = response.data.data[0];

    if (existingRating) {
      // Uppdatera befintligt betyg
      await axios.put(`http://localhost:1337/api/ratings/${existingRating.id}`, {
        data: {
          value: value,
        },
      }, {
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
      });
      console.log("Rating updated successfully");
    } else {
      // Skapa nytt betyg
      await axios.post("http://localhost:1337/api/ratings", {
      data: {
        value: value,
        user: {
          connect: [user.id]
        },
        book: {
          connect: [bookId]
        },
      }, headers: {
        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
      }
    });
      console.log("Rating created successfully");
    }
  } catch (error) {
    console.error("Failed to do a rating:", error.response?.data || error.message);
  }
}


//* Event listeners for sort buttons
document.getElementById('sort-author-btn').addEventListener('click', sortBooksByAuthor);
document.getElementById('sort-title-btn').addEventListener('click', sortBooksByTitle);

document.addEventListener('DOMContentLoaded', async function() {
  fetchTheme();
  await getRatings();
  renderPage();
  displayAllBooks();
});

//*___________Theme__________

let fetchTheme = async () => {
  try {
    let response = await axios.get('http://localhost:1337/api/display');
    let themeName = response.data.data.attributes.theme; 
    console.log("THEME: ", themeName);
    document.body.className = themeName;    
  } catch (error) {
    console.error('Failed to fetch theme:', error);
  }
}