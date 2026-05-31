export interface FeedSource {
  title: string;
  feeds: Array<{
    title: string;
    rssUrl: string;
  }>;
}

const documentary: FeedSource = {
  title: "Documentary",
  feeds: [
    {
      title: "Darknet Diaries",
      rssUrl: "https://feeds.megaphone.fm/darknetdiaries",
    },
    {
      title: "99% Invisible",
      rssUrl: "https://feeds.simplecast.com/BqbsxVfO",
    },
    {
      title: "Cautionary Tales",
      rssUrl:
        "https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/c0ae8c6e-22f0-4e9b-ac1c-ae390037ac53/7f5a4714-6b10-4ccf-a424-ae390037ac70/podcast.rss",
    },
    {
      title: "In Our Time",
      rssUrl: "https://podcasts.files.bbci.co.uk/b006qykl.rss",
    },
  ],
};

const gameShows: FeedSource = {
  title: "Game Shows",
  feeds: [
    {
      title: "Lateral with Tom Scott",
      rssUrl: "https://audioboom.com/channels/5097784.rss",
    },
    {
      title: "Escape This Podcast",
      rssUrl: "https://www.escapethispodcast.com/feed.xml",
    },
    {
      title: "Solve This Murder",
      rssUrl: "https://www.solvethismurder.com/feed.xml",
    },
  ],
};

const history: FeedSource = {
  title: "History",
  feeds: [
    {
      title: "Rex Factor",
      rssUrl: "https://feeds.megaphone.fm/GLT5291067453",
    },
    {
      title: "Totalis Rankium - Roman Emperors",
      rssUrl: "https://feed.podbean.com/totalusrankium/feed.xml",
    },
    {
      title: "Totalis Rankium - American Presidents",
      rssUrl: "https://feed.podbean.com/totalusrankiumap/feed.xml",
    },
    {
      title: "Totalis Rankium - Pirates",
      rssUrl: "https://feed.podbean.com/TotalusRankiumP/feed.xml",
    },
    {
      title: "Pontifacts",
      rssUrl: "https://feed.podbean.com/pontifacts/feed.xml",
    },
    {
      title: "Sagathing",
      rssUrl: "https://feed.podbean.com/sagathing/feed.xml",
    },
  ],
};

const rpgLetsPlays: FeedSource = {
  title: "RPG Lets-Plays",
  feeds: [
    {
      title: "Critical Role - Vox Machina",
      rssUrl: "https://feeds.megaphone.fm/DYEAN7027366551",
    },
    {
      title: "Critical Role",
      rssUrl: "https://feeds.simplecast.com/LXz4Q9rJ",
    },
    {
      title: "High Rollers D&D",
      rssUrl: "https://feeds.megaphone.fm/NSR8625352094",
    },
    {
      title: "Mystery Quest",
      rssUrl: "https://feeds.megaphone.fm/NSR3713660967",
    },
  ],
};

const feeds: FeedSource[] = [documentary, gameShows, history, rpgLetsPlays];
export default feeds;
