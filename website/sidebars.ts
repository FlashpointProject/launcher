/* eslint-disable jsdoc/check-alignment */
import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: 'doc',
      id: 'introduction',
      label: 'Getting Started'
    }, {
      type: 'category',
      label: 'Configuration',
      items: [
        'configuration/services',
        'configuration/shortcuts',
        'configuration/credits',
      ]
    }, {
      type: 'category',
      label: 'Development',
      items: [
        'development/introduction',
        'development/setup',
        'development/gitworkflow',
        {
          type: 'category',
          label: 'Common Practices',
          items: [
            'development/communication',
            'development/database',
            'development/addingpages',
          ]
        }
      ]
    }, {
      type: 'category',
      label: 'Extensions',
      items: [
        'extensions/overview',
      ]
    }
  ],
};

export default sidebars;
