import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";


export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#803333",
        tabBarInactiveTintColor: "#777",
        tabBarStyle: {
          height: 65,
          paddingBottom: 8,
          paddingTop: 5,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="datos"
        options={{
          title: "Datos",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="personajes"
        options={{
          title: "Personajes",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="skull-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="frutas"
        options={{
          title: "Frutas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="nutrition-outline"
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}