import "react-native-reanimated";
import { Stack } from "expo-router";
import { StripeProvider } from "@stripe/stripe-react-native";

const STRIPE_KEY =
  "pk_test_51TDqYQK4IUtLvK1LkzyhMA2EtACBD9HC3OSjSdQ35PZqMtbOu80RmyKgpXXpe8r4Ft8PhVO1JR5w3Is125DYfnxG00R7opWrw0";

export default function RootLayout() {
  return (
    <StripeProvider publishableKey={STRIPE_KEY}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="AISuggestionScreen" />
        <Stack.Screen name="TryOnHistoryScreen" />
        <Stack.Screen name="PaymentScreen" />
        <Stack.Screen name="AboutUsScreen" />
      </Stack>
    </StripeProvider>
  );
}
