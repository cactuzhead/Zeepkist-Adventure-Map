# Zeepkist Adventure Map
<img src="docs/assets/Zeepkist Adventure Map - Hero Banner.png" alt="Zeepkist Adventure Map" style="width: 500px; height: auto;">

<a href="https://cactuzhead.github.io/Zeepkist-Adventure-Map/">[ko-fi](https://cactuzhead.github.io/Zeepkist-Adventure-Map/)</a>


This website lets you track your progress as well as view all level thumbnails and medal times from Zeepkist’s Adventure Mode.

By clicking on each map pin, you can cycle through the different completion states, making it easy to set, and then see which maps you’ve already completed.

<br>
<div>
  <img src="docs/assets/ko-fi.png" alt="Ko-Fi" width="100" height="auto" style="vertical-align: middle;">
  <span>&nbsp;&nbsp;&nbsp;If you find value in this website and would like to support us, please consider using our <a href="https://ko-fi.com/cactuzhead">ko-fi</a></span>
</div>
<br>

### Completions States
When you start, all the map pins should be a red cross icon, denoting an uncompleted map.

If you click on any map pin you can cycle through all the various completion states Uncompleted -> Bronze -> Silver -> Gold -> Author and back to  Uncompleted.

<img src="docs/assets/cycle.png" alt="completion states" style="width: 350px; height: auto;">

Every time you change the state, the map pin icon will move to the next state, and the popup card will change to reflect the current state.

<img src="docs/assets/completion.png" alt="completion states" style="width: 500px; height: auto;">

### Border
In the above screenshot, you can see that the border of the popup card has changed to match the current status icon (Gold in this case).

### Medals
Additionally, the completed medals will have a tick mark next to their times and will also be brighter to indicate that you have completed these medals.

You can see that because the Gold medal has been completed, bronze and silver are also checked and brighter.  Only the green Author medal is dimmer and without a check mark.

### Colors
The level name and the horizontal line beside it (representing the track) always match the color of the track on the main map. For example, all Y (YouTuber) levels are shown in red and all OR (Off-Road) maps are a bright green.


## Top Menu Bar
The top menu bar is where stats and controls are available.

### Medal Counters
<img src="docs/assets/counters.png" alt="medal counters" style="width: 500px; height: auto;">

These counters show the totals for each medal as well as uncompleted levels and a grand total which should always be 114.

In this example you can see that the player has authored 53 levels but still has 11 levels they have not yet at least reached bronze in.

### Controls
<img src="docs/assets/controls.png" alt="menu controls" style="width: 300px; height: auto;">

There are buttons to reach this read me file, export & import buttons, and a toggle to change between light and dark mode.


## Read Me
If you are reading this manual then you have most likely already found the `Read Me` button on the top menu bar.


## Data Storage
Your data is stored locally in your browser using localStorage, which means it does not sync across different browsers or devices.

As a result, if you clear your browser data or switch to another device or browser, your saved progress may be unavailable or permanently lost.


### Export / Import
We recommend exporting a backup of your data to a locally saved JSON file using the `Export` button in the top menu bar.

This allows you to `Import` the data back into the same browser - or into a different browser or device if needed.

Please note that any changes made after exporting will not automatically sync between browsers or devices.

You are also free to create and keep multiple export files if you wish  - how you manage them is entirely up to you.


## Window Scaling
While the map automatically scales to fit your window width, please note that the map pins may appear slightly misaligned by a pixel or two.

For the best experience, we recommend viewing the map at the largest size possible on your PC - ideally at a width of 1333px or greater.
