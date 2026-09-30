import { Tabs } from "expo-router";
import { Home, Search, Settings, History, Library } from "lucide-react-native";

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarHideOnKeyboard: true,
                tabBarActiveTintColor: '#A78BFA',
                tabBarInactiveTintColor: 'rgba(255,255,255,0.55)',
                tabBarStyle: {
                    position: 'absolute',
                    left: 16,
                    right: 16,
                    bottom: 16,
                    height: 68,
                    paddingTop: 10,
                    paddingBottom: 12,
                    borderRadius: 24,
                    backgroundColor: '#0B0B0F',
                    borderTopWidth: 0,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                    elevation: 12,
                    shadowColor: '#000',
                    shadowOpacity: 0.4,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: 10 },
                },
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                    marginTop: 3,
                },
                tabBarIconStyle: {
                    marginTop: 2,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Latest",
                    tabBarIcon: ({ color }) => <Home color={color} size={22} />,
                }}
            />
            <Tabs.Screen
                name="search"
                options={{
                    title: "Search",
                    tabBarIcon: ({ color }) => <Search color={color} size={22} />,
                }}
            />
            <Tabs.Screen
                name="history"
                options={{
                    title: "History",
                    tabBarIcon: ({ color }) => <History color={color} size={22} />,
                }}
            />
            <Tabs.Screen
                name="library"
                options={{
                    title: "Library",
                    tabBarIcon: ({ color }) => <Library color={color} size={22} />,
                }}
            />
            <Tabs.Screen
                name="config"
                options={{
                    title: "Config",
                    tabBarIcon: ({ color }) => <Settings color={color} size={22} />,
                }}
            />
            {/*<Tabs.Screen
        name="jkanime"
        options={{
          title: 'Jkanime',
          tabBarIcon: ({ color }) => <Settings color={color} />,
        }}
      />*/}
        </Tabs>
    );
}
