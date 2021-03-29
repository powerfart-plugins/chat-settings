/* eslint-disable object-property-newline */
const { Plugin } = require('powercord/entities');
const { inject, uninject } = require('powercord/injector');
const { React, getModule } = require('powercord/webpack');
const { findInReactTree } = require('powercord/util');

const SettingsView = getModule((m) => m?.displayName === 'SettingsView', false);
const { getUserSettingsSections } = getModule([ 'getUserSettingsSections' ], false);

module.exports = class ChatSettings extends Plugin {
  async startPlugin () {
    this.loadStylesheet('style.css');
    this.genSections();
    this.registerCommand();
    this.patchEmbed();
  }

  pluginWillUnload () {
    powercord.api.commands.unregisterCommand('settings');
    uninject('chat-settings-embed');
  }

  genSections () {
    this.sections = [];
    powercord.once('loaded', () => {
      this.sections = [
        ...getUserSettingsSections({}),
        ...Object.values(powercord.api.settings.tabs)
          .map(({ label, render }) => ({
            element: render,
            section: (typeof label === 'function') ? label() : label,
            label: (typeof label === 'function') ? label() : label
          }))
      ];
    });
  }

  registerCommand () {
    powercord.api.commands.registerCommand({
      command: 'settings',
      label: 'Chat Settings',
      usage: '{c} [ tab ]',
      description: 'Opens the settings tab directly in the chat',
      executor: this.getSettings.bind(this),
      autocomplete: this.autocomplete.bind(this)
    });
  }

  getSettings (args) {
    const { section } = this.sections
      .find(({ label }) => (label.toLowerCase() === args.join(' ').toLowerCase()));

    if (!section) {
      return false;
    }
    console.log(section);

    return {
      result: {
        type: 'component',
        provider: { name: { props: { // props.render() so that findInReactTree can find this method easily
          render: () => React.createElement(SettingsView, {
            section,
            sections: this.sections
          })
        } } }
      }
    };
  }

  autocomplete (args) {
    const tab = args.join(' ').toLowerCase();
    return {
      commands: this.sections
        .filter(({ label }) => label.toLowerCase().includes(tab))
        .map(({ label }) => ({ command: label })),
      header: 'Settings tabs'
    };
  }

  patchEmbed () { // basic patch hack
    const Embed = getModule((m) => m.default && m.default.displayName === 'Embed', false);
    inject('chat-settings-embed', Embed.default.prototype, 'render', (args, res) => {
      const children = findInReactTree(res, ({ props }) => props?.render);
      if (children) {
        return React.createElement('div', {
          className: 'chat-settings-container',
          children: children.props.render()
        });
      }
      return res;
    });
    Embed.default.displayName = 'Embed';
  }
};
