import { Redirect } from 'expo-router';
export default function LegacyProgressRoute() { return <Redirect href={'/progress' as never} />; }
