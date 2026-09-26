import { gql } from "@apollo/client";

export const MY_RESTAURANTS = gql`
  query MyRestaurants(
    $search: String
    $status: RestaurantStatus
    $city: String
  ) {
    myRestaurants(search: $search, status: $status, city: $city) {
      id
      slug
      name
      status
      cuisine
      phone
      address {
        line1
        city
        state
        zip
      }
      tables {
        id
        name
        minCapacity
        maxCapacity
        floorArea
        active
      }
      shifts {
        id
        name
        daysOfWeek
        startTime
        endTime
        active
      }
    }
  }
`;

export const MY_OWNER_OVERVIEW = gql`
  query MyOwnerOverview($date: String) {
    myOwnerOverview(date: $date) {
      locationsTotal
      locationsActive
      todayReservations
      todayCovers
      openWaitlist
      unreadNotifications
      locations {
        restaurantId
        name
        status
        cuisine
        city
        state
        todayReservations
        todayCovers
        openWaitlist
        tableCount
      }
    }
  }
`;
