import {Notice, Plugin, TFile} from 'obsidian';
import {
	mkdocsSettingsTab,
	mkdocsPublicationSettings,
	DEFAULT_SETTINGS,
} from "./settings";
//import {ShareStatusBar} from "./status_bar";
import MkdocsPublish from "./publication";
import {disablePublish} from './utils'


export default class mkdocsPublication extends Plugin {
	settings: mkdocsPublicationSettings;

	async onload() {
		console.log('Mkdocs Publication loaded');
		await this.loadSettings();
		this.addSettingTab(new mkdocsSettingsTab(this.app, this));

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file:TFile) =>{
				if (!disablePublish(this.app, this.settings, file) || !this.settings.fileMenu){
					return false;
				}
					menu.addSeparator();
					menu.addItem((item)=>{
						item.setTitle("Share " + file.basename + " with Mkdocs Publication")
							.setIcon("share")
							.onClick(async()=>{
								try {
									const publish = new MkdocsPublish(this.app.vault, this.app.metadataCache, this.settings);
									const publishSuccess = await publish.publish(file, true);
									if (publishSuccess) {
									new Notice("Successfully published "+ file.basename +" to mkdocs.")
									}
								}catch (e) {
									console.error(e);
									new Notice("Error publishing to mkdocs.")
								}
							});
					})
					menu.addSeparator();
			})
		)

		this.addCommand({
			id: 'obs2mk-one',
			name: 'Share one note',
			hotkeys:[],
			checkCallback: (checking) => {
				if (disablePublish(this.app, this.settings, this.app.workspace.getActiveFile())) {
					if (!checking) {
						try {
							const {vault, workspace, metadataCache} = this.app;
							const currentFile = workspace.getActiveFile();
							const publishFile = new MkdocsPublish(vault, metadataCache, this.settings);
							const publishSuccess = publishFile.publish(currentFile, true);
							//if (publishSuccess) {
							//	new Notice("Successfully published "+ currentFile.basename +" to mkdocs.")
							//}
						} catch (e) {
							console.error(e);
							new Notice("Error publishing to mkdocs.")
						}
					}
					return true;
				} return false;
			},
		});
		this.addCommand({
			id: 'obs2mk-publish-all',
			name: 'Share all marked notes',
			callback: async () => {
				//const statusBarItems = this.addStatusBarItem();
				try {
					const {vault, metadataCache} = this.app;
					console.log('Publish')
					const publish = new MkdocsPublish(vault, metadataCache, this.settings);
					console.log('Shared')
					const sharedFiles = await publish.getSharedFiles();
					console.log('get shared')
					//const statusBar = new ShareStatusBar(statusBarItems, sharedFiles.length);
					let errorCount = 0;
					if (sharedFiles.length > 0) {
						const publishedFiles = sharedFiles.map(file => file.name);
						// upload list of published files in Source
						const publishedFilesText = publishedFiles.toString();
						console.log('upload')
						await publish.uploadText('vault_published.txt', publishedFilesText);
						console.log('upload2')
						for (let files = 0; files < sharedFiles.length; files++) {
							try {
								let file = sharedFiles[files]
								//statusBar.increment();
								console.log('publish')
								await publish.publish(file);
							} catch {
								errorCount++;
								new Notice(`Unable to publish note ${sharedFiles[files].name}, skipping it`)
							}
						}
						//statusBar.finish(8000);
						new Notice(`Successfully published ${publishedFiles.length - errorCount} notes to mkdocs.`);
					}
				} catch (e) {
					//statusBarItems.remove();
					console.error(e)
					new Notice('Unable to publish multiple notes, something went wrong.')
				}
			},
		});

	}
	onunload() {
		console.log('Mkdocs Publication unloaded');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

