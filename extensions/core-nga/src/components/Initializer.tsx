import React from 'react';

export default function Initializer() {
  // Run this once when first loaded
  React.useEffect(() => {
    // Update the display settings with our components
    const compDisplay = [
      'nga/NgRating',
      'nga/NgViews',
      'nga/NgScore',
      'nga/NgFaves',
      'nga/NgCredits',
      'nga/NgTrophies',
      'nga/NgAuthorComments',
    ];

    // Remove the unused fields
    const unusedFields = [
      'game_alternateTitles',
      'game_playMode',
      'game_status',
      'game_version',
      'game_platforms',
      'game_publisher',
      'game_series',
      'game_language',
      'game_addApps',
      'game_notes',
    ];

    window.setDisplaySettings((displaySettings) => {
      for (const field of unusedFields) {
        const idx = displaySettings.gameSidebar.middle.findIndex(f => f === field);
        if (idx > -1) {
          displaySettings.gameSidebar.middle.splice(idx, 1);
        }
      }

      for (const field of unusedFields) {
        const idx = displaySettings.gameSidebar.bottom.findIndex(f => f === field);
        if (idx > -1) {
          displaySettings.gameSidebar.bottom.splice(idx, 1);
        }
      }

      // Insert below alt titles
      const sidebarMiddle = [...displaySettings.gameSidebar.middle];
      const platformsIdx = sidebarMiddle.findIndex(s => s === 'game_alternateTitles');
      if (platformsIdx > -1 && platformsIdx <= sidebarMiddle.length) {
      // Place our components after tha platforms component
        displaySettings.gameSidebar.middle = [
          ...sidebarMiddle.slice(0, platformsIdx),
          ...compDisplay,
          ...displaySettings.gameSidebar.middle.slice(platformsIdx)
        ];
      } else {
      // If platforms is not in the middle to put after, just add to end of middle section
        displaySettings.gameSidebar.middle = sidebarMiddle.concat(compDisplay);
      }

      // Add role icon
      displaySettings.gameGrid.upper.unshift('nga/NgRatingGridIcon');
      displaySettings.gameList.columns.push({
        headerComponent: 'nga/NgRatingListIconHeader',
        rowComponent: 'nga/NgRatingListIconRow',
        type: 'icon'
      });
      displaySettings.gameList.columns.push({
        headerComponent: 'nga/NgViewsListHeader',
        rowComponent: 'nga/NgViewsListRow',
        type: 'normal',
        weight: 0.65
      });
      displaySettings.gameList.columns.push({
        headerComponent: 'nga/NgScoreListHeader',
        rowComponent: 'nga/NgScoreListRow',
        type: 'normal',
        weight: 0.5
      });

      // Remove publisher col
      const pubIdx = displaySettings.gameList.columns.findIndex(c => c.headerComponent === 'gameCol_header_publisher');
      if (pubIdx > -1) {
        displaySettings.gameList.columns.splice(pubIdx, 1);
      }
      // Remove platform col
      const platIdx = displaySettings.gameList.columns.findIndex(c => c.headerComponent === 'gameCol_header_platform');
      if (platIdx > -1) {
        displaySettings.gameList.columns.splice(platIdx, 1);
      }

      displaySettings.searchComponents.push('nga/NgRatingSearchableSelect');

      return displaySettings;
    });

    window.setExtOrderables((orderables) => {
      orderables.push({
        title: 'NG Ratings',
        extId: 'nga',
        key: 'rating',
        default: 'u'
      });
      orderables.push({
        title: 'NG Views',
        extId: 'nga',
        key: 'views',
        default: 0
      });
      orderables.push({
        title: 'NG Score',
        extId: 'nga',
        key: 'score',
        default: 0
      });
      orderables.push({
        title: 'NG Faves',
        extId: 'nga',
        key: 'faves',
        default: 0
      });

      return orderables;
    });
  });

  return <></>;
}
