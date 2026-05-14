const { City } = require('country-state-city');
const parts = 'Jamshedpur, JH, IN'.split(', ');
const city = City.getCitiesOfState(parts[2], parts[1]).find(c => c.name === parts[0]);
console.log(city);
