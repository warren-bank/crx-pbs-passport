### [PBS Passport](https://github.com/warren-bank/crx-pbs-passport)

#### Summary:

Chromium browser extension:
* works on pages that are hosted at: `player.pbs.org`
* searches for link to video file
* replaces the page contents with an HTML5 _&lt;video&gt;_ player

#### UI:

* there is no user interface (UI)
* the extension works silently in the background
* after installation, an icons is added to the "Chrome toolbar"
  * there is no way for the extension to prevent this from happening
  * to hide ( but [not remove](https://superuser.com/questions/1048619) ) it, you can right-click on the icon and select: "Hide in Chrome menu"

#### Legal:

* copyright: [Warren Bank](https://github.com/warren-bank)
* license: [GPL-2.0](https://www.gnu.org/licenses/old-licenses/gpl-2.0.txt)

#### Legality:

* no idea..
  * the URL of the video file is buried in the page content
  * all this extension does is to bring it into focus
