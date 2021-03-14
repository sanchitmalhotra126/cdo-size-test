import React from 'react';
import LevelDetailsDialog from './LevelDetailsDialog';

const defaultProps = {
  handleClose: () => {
    console.log('closed');
  }
};

const standaloneVideoScriptLevel = {
  url: '/s/csd2-2021/stage/3/puzzle/6',
  level: {
    type: 'StandaloneVideo',
    longInstructions:
      '## Questions to consider:\n* What is debugging?\n* What are the four steps to debugging?',
    videoOptions: {
      autoplay: false,
      download: 'https://videos.code.org/levelbuilder/debugging_sm-mp4.mp4',
      enable_fallback: true,
      key: 'csd_debugging',
      name: 'Debugging',
      src:
        'https://www.youtube-nocookie.com/embed/auv10y-dN4s/?autoplay=0&enablejsapi=1&iv_load_policy=3&modestbranding=1&rel=0&showinfo=1&v=auv10y-dN4s&wmode=transparent',
      thumbnail: 'studio.code.org/c/video_thumbnails/csd_debugging.jpg'
    }
  }
};

const externalMarkdownScriptLevel = {
  url: '/s/csd5-2021/stage/10/puzzle/1',
  level: {
    type: 'External',
    markdown:
      '## Best Class Pet \n### Here are three different ways to show the results of a vote for best class pet.'
  }
};

const levelGroupScriptLevel = {
  url: '/s/csd6-2020/stage/16/puzzle/9/page/1',
  level: {
    type: 'LevelGroup'
  }
};

const bubbleChoiceScriptLevel = {
  url: '/s/csd6-2020/stage/16/puzzle/9/page/1',
  levelNumber: 2,
  icon: 'fa-sitemap',
  id: 'scriptlevel',
  status: 'not_tried',
  level: {
    type: 'BubbleChoice',
    name: 'parentLevel'
  },
  sublevels: [
    {
      type: 'External',
      markdown:
        '## Best Class Pet \n### Here are three different ways to show the results of a vote for best class pet.',
      thumbnail_url:
        'https://images.code.org/c1fb2198202517b8ddfe3ccb9865ca3e-image-1562863985170.JPG',
      long_instructions:
        '## Best Class Pet \n### Here are three different ways to show the results of a vote for best class pet.',
      letter: 'a',
      name: 'sublevel1',
      id: 'sublevel1',
      status: 'not_tried'
    },
    {
      type: 'External',
      markdown:
        '## Wiring Up the UI\nWith your user interface in place, you can now add event handlers for your interface elements. At this point you may want to just include console.log() commands to make sure that your events are working as expected - you can add the functional code later one.',
      thumbnail_url:
        'https://images.code.org/55d1b7020f9ab14d733697ebd53eea6c-image-1561698487741.07.21 PM.png',
      long_instructions:
        '## Best Class Pet \n### Here are three different ways to show the results of a vote for best class pet.',
      letter: 'b',
      name: 'sublevel2',
      id: 'sublevel2',
      status: 'not_tried'
    }
  ]
};

export default storybook => {
  storybook.storiesOf('LevelDetailsDialog', module).addStoryTable([
    {
      name: 'StandaloneVideo',
      story: () => (
        <LevelDetailsDialog
          {...defaultProps}
          scriptLevel={standaloneVideoScriptLevel}
        />
      )
    },
    {
      name: 'External',
      story: () => (
        <LevelDetailsDialog
          {...defaultProps}
          scriptLevel={externalMarkdownScriptLevel}
        />
      )
    },
    {
      name: 'LevelGroup',
      story: () => (
        <LevelDetailsDialog
          {...defaultProps}
          scriptLevel={levelGroupScriptLevel}
        />
      )
    },
    {
      name: 'BubbleChoice',
      story: () => (
        <LevelDetailsDialog
          {...defaultProps}
          scriptLevel={bubbleChoiceScriptLevel}
        />
      )
    }
  ]);
};
