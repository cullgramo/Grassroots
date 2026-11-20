import { SymbolView } from 'expo-symbols';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useOpenFromReminder } from '@/lib/reminders';

/** The four places in the app. The map comes first: it is what Grassroots is for. */
export default function TabLayout() {
  const colorScheme = useColorScheme();
  const tint = Colors[colorScheme].tint;
  // A tapped reminder opens its fixture. It lives here because the tabs only exist once the app can navigate.
  useOpenFromReminder();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: tint,
        // The tab you are on sits on a soft wash of the tint, so it reads at a glance.
        tabBarActiveBackgroundColor: `${tint}1f`,
        tabBarItemStyle: { borderRadius: 14, marginHorizontal: 6 },
        tabBarLabelStyle: { fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          headerShown: false,
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'map', android: 'map', web: 'map' }} tintColor={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="list"
        options={{
          title: 'List',
          headerShown: false,
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'list.bullet', android: 'list', web: 'list' }} tintColor={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="favourites"
        options={{
          title: 'Favourites',
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'star', android: 'star', web: 'star' }} tintColor={color} size={26} />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'ellipsis.circle', android: 'more_horiz', web: 'more_horiz' }} tintColor={color} size={26} />,
        }}
      />
    </Tabs>
  );
}
