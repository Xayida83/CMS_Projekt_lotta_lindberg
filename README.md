### Översikt och Flöde

1. **Sidan laddas**: När användaren besöker sidan laddas alla resurser och JavaScript körs.
2. **DOMContentLoaded-event**: När hela HTML-dokumentet har lästs och analyserats, men innan externa resurser som bilder och stilar har laddats, triggas `DOMContentLoaded`-händelsen. Detta är när vårt JavaScript börjar köra sina initieringsrutiner.

### Steg-för-steg Flöde

#### 1. Sidan laddas och DOMContentLoaded-event triggas


``` javascriot
document.addEventListener('DOMContentLoaded', async function() {
fetchTheme();          // Hämtar och sätter sidans tema.
await getRatings();    // Hämtar användarens betyg om användaren är inloggad.
renderPage();          // Renderar sidan baserat på om användaren är inloggad eller inte.
displayAllBooks();     // Visar alla böcker på sidan. });
``` 
- **`fetchTheme`**: Hämtar sidans tema från servern och applicerar det på sidan.
- **`getRatings`**: Om användaren är inloggad, hämtar denna funktion användarens betyg på böcker.
- **`renderPage`**: Kontrollerar om användaren är inloggad och renderar sidan därefter.
- **`displayAllBooks`**: Hämtar alla böcker från servern och visar dem på sidan.

#### 2. Temahantering (`fetchTheme`)

```Javascript

const fetchTheme = async () => {
try {
  const response = await apiCall('get', '/display', null, false); // requiresAuth = false
  const themeName = response.data.attributes.theme;
  console.log("THEME: ", themeName);
  document.body.className = themeName;
} catch (error) {
  console.error('Failed to fetch theme:', error);
} };
```
- Gör ett GET-anrop till `/display` för att hämta temat.
- Applicerar temat genom att sätta `document.body.className`.

#### 3. Hämtar användarbetyg (`getRatings`)

```javascript
const getRatings = async () => {   
  try {     
  const user = await getLoggedInUser();     
  if (!user || !user.id) {       
  console.error("No user logged in.");       
  return;     
}      
const response = await apiCall('get', `/ratings?filters[user][id][$eq]=${user.id}&populate=book`);     
  console.log("RATINGS", response.data);     
  sessionStorage.setItem("ratings", JSON.stringify(response.data));   
} catch (error) {     
  console.error("Failed to fetch ratings:", error);   } };
```

- Hämtar den inloggade användaren.
- Om användaren är inloggad, hämtar betyg som användaren har gett på böcker och lagrar dem i `sessionStorage`.

#### 4. Renderar sidan (`renderPage`)

```javascript
const renderPage = async () => {
  let isLoggedIn = await getLoggedInUser();
  if (isLoggedIn) {
    document.querySelector("#login-wrapper").style.display = "none";
    document.querySelector("#welcome-page").style.display = "block";
    document.querySelector("#welcome-page h1").innerText = `Welcome, ${isLoggedIn.username} !`;
     await getRatings();
     await displayUserBooks();
      await displayAllBooks();
  } else {
    document.querySelector("#login-wrapper").style.display = "flex";
    document.querySelector("#welcome-page").style.display = "none";
  }
};
```
- Kontrollerar om användaren är inloggad genom att kalla på `getLoggedInUser`.
- Om inloggad, döljs inloggningsformuläret och välkomstsidan visas med användarens namn. Dessutom hämtas användarens betyg, användarens böcker och alla böcker.
- Om inte inloggad, visas inloggningsformuläret.

#### 5. Visar alla böcker (`displayAllBooks`)
```javascript
const displayAllBooks = async () => {
  const books = await fetchBooks();
  const booksContainer = document.querySelector("#books-container");
  booksContainer.innerHTML = "";
  createBookCards(books, booksContainer);
};`
```
- Hämtar alla böcker från servern genom att kalla på `fetchBooks`.
- Rensar bokcontainern innan nya bokkort skapas och visas.

#### 6. Hämtar alla böcker (`fetchBooks`)
```javascript
const fetchBooks = async () => {
   try {
     const response = await apiCall('get', '/books?populate=*', null, false); // requiresAuth = false
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
```
- Hämtar alla böcker från servern.
- Beräknar genomsnittligt betyg för varje bok och returnerar en array av böcker.

#### 7. Skapar bokkort (`createBookCards`)

```javascript
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
```

- Skapar bokkort för varje bok i listan.
- Lägger till eventlyssnare för betygsättningsstjärnorna och "Read it"-knappen.

### Sammanfattning

1. När sidan laddas, hämtar vi sidans tema och användarens betyg om användaren är inloggad.
2. Sedan renderar vi sidan baserat på om användaren är inloggad eller inte.
3. Vi hämtar och visar alla böcker på sidan, och om användaren är inloggad, visas deras betyg för varje bok.
4. Eventuella interaktioner som inloggning, registrering, utloggning och betygsättning hanteras genom API-anrop och uppdateringar av DOM.

Genom att ha denna översikt är det lättare att förstå hur olika delar av applikationen samverkar och hur data flödar från servern till användarens skärm.
