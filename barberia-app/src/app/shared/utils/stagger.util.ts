/**
 * Replays the staggered entrance (`.stagger-item` in global.scss) of a page's items. Ionic keeps tab
 * pages alive, so call it from `ionViewWillEnter` to see the entrance every time the tab is shown.
 * Items rendered later (data arriving, another day) animate on their own while the class is on.
 */
export function replayStagger(host: HTMLElement): void {
  host.classList.remove('stagger-play');
  // Reading the layout makes the browser drop the old animations before they are added back.
  void host.offsetWidth;
  host.classList.add('stagger-play');
}
