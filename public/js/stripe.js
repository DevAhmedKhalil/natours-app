/* eslint-disable */
import axios from 'axios';
const { showAlert } = require('./alerts');

export const bookTour = async tourId => {
  try {
    // const stripe = Stripe(
    //   'pk_test_51Opd8kJacqY7AAzp5xahCkaz9FbAc8QFx4OhDXBlL11u1gXyAKJnp1y2Mxdz5p6ZJjBYuGmZb4T7WvjKAiIvkO6v001TfhFyFM'
    // );

    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    // console.log(session);

    // await stripe.redirectToCheckout({
    //   sessionId: session.data.session.id
    // });

    //@ works as expected
    window.location.replace(session.data.session.url);
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
