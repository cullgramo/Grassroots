// The national hockey leagues and Leinster hockey, from the umpires' public weekly lists.
// These pages are built the same way as the Ulster one, so the same reader is used.
// Umpires' names on the page are never read.
export { read } from './ulster-hockey.mjs';

export const name = 'Irish Hockey';
export const pages = [
  { url: 'https://irishhua.com/public/fixturesquick.php', prefix: '', area: 'Ireland', level: 'top' },
  { url: 'https://leinsterhua.com/public/fixturesquick.php', prefix: 'Leinster', area: 'Leinster' },
  { url: 'https://munsterhua.com/public/fixturesquick.php', prefix: 'Munster', area: 'Munster' },
  { url: 'https://connachthua.com/public/fixturesquick.php', prefix: 'Connacht', area: 'Connacht' },
];
