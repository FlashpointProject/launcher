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

    for (const field of unusedFields) {
      const idx = window.displaySettings.gameSidebar.middle.findIndex(f => f === field);
      if (idx > -1) {
        window.displaySettings.gameSidebar.middle.splice(idx, 1);
      }
    }

    for (const field of unusedFields) {
      const idx = window.displaySettings.gameSidebar.bottom.findIndex(f => f === field);
      if (idx > -1) {
        window.displaySettings.gameSidebar.bottom.splice(idx, 1);
      }
    }

    // Insert below alt titles
    const sidebarMiddle = [...window.displaySettings.gameSidebar.middle];
    const platformsIdx = sidebarMiddle.findIndex(s => s === 'game_alternateTitles');
    if (platformsIdx > -1 && platformsIdx <= sidebarMiddle.length) {
    // Place our components after tha platforms component
      window.displaySettings.gameSidebar.middle = [
        ...sidebarMiddle.slice(0, platformsIdx),
        ...compDisplay,
        ...window.displaySettings.gameSidebar.middle.slice(platformsIdx)
      ];
    } else {
    // If platforms is not in the middle to put after, just add to end of middle section
      window.displaySettings.gameSidebar.middle = sidebarMiddle.concat(compDisplay);
    }

    // Add role icon
    window.displaySettings.gameGrid.upper.unshift('nga/NgRatingGridIcon');
    window.displaySettings.gameList.columns.push({
      headerComponent: 'nga/NgRatingListIconHeader',
      rowComponent: 'nga/NgRatingListIconRow',
      type: 'icon'
    });
    window.displaySettings.gameList.columns.push({
      headerComponent: 'nga/NgViewsListHeader',
      rowComponent: 'nga/NgViewsListRow',
      type: 'normal',
      weight: 0.65
    });

    // Remove publisher col
    const pubIdx = window.displaySettings.gameList.columns.findIndex(c => c.headerComponent === 'gameCol_header_publisher');
    if (pubIdx > -1) {
      window.displaySettings.gameList.columns.splice(pubIdx, 1);
    }
    // Remove platform col
    const platIdx = window.displaySettings.gameList.columns.findIndex(c => c.headerComponent === 'gameCol_header_platform');
    if (platIdx > -1) {
      window.displaySettings.gameList.columns.splice(platIdx, 1);
    }

    window.displaySettings.searchComponents.push('nga/NgRatingSearchableSelect');
    window.ext.orderables.push({
      title: 'NG Ratings',
      extId: 'nga',
      key: 'rating',
      default: 'u'
    });
    window.ext.orderables.push({
      title: 'NG Views',
      extId: 'nga',
      key: 'views',
      default: 0
    });
    window.ext.orderables.push({
      title: 'NG Score',
      extId: 'nga',
      key: 'score',
      default: 0
    });
    window.ext.orderables.push({
      title: 'NG Faves',
      extId: 'nga',
      key: 'faves',
      default: 0
    });
  });

  return <></>;
}
