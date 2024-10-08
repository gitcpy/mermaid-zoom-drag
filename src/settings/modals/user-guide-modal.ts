import { App, Modal } from 'obsidian';
import DiagramZoomDragPlugin from '../../core/diagram-zoom-drag-plugin';
import path from 'path';
import https from 'https';
import { URL } from 'url';

export class UserGuideModal extends Modal {
    constructor(
        app: App,
        public plugin: DiagramZoomDragPlugin
    ) {
        super(app);
        this.titleEl.textContent = 'Guide';
    }

    async onOpen() {
        const { contentEl } = this;

        contentEl.empty();

        const heading = contentEl.createEl('h2', {
            text: 'How to Find Diagram Selectors in DevTools',
        });
        contentEl.appendChild(heading);

        const description = contentEl.createEl('p', {
            text: 'To identify the CSS selectors for diagrams on this page, follow these steps using your browser’s DevTools:',
        });
        contentEl.appendChild(description);

        const stepsHeading = contentEl.createEl('h3', {
            text: 'Steps to Find Selectors:',
        });
        contentEl.appendChild(stepsHeading);

        const stepsList = contentEl.createEl('ol');
        const steps = [
            'Open the markdown view in Obsidian where the diagram is displayed.',
            'Open DevTools by pressing `CTRL` + `SHIFT` + `I` on the keyboard.',
            'Click the "Select an element on this page to inspect it" button (usually a mouse icon) in the top-left corner of the DevTools window.',
            'Move your cursor over the diagram and click on it to select the element.',
            'In the Elements tab of DevTools, you will see the HTML element corresponding to the diagram highlighted.',
            'Look at the classes applied to this element in the DevTools panel to identify the CSS selectors you need.',
        ];

        steps.forEach((step) => {
            const listItem = contentEl.createEl('li', { text: step });
            stepsList.appendChild(listItem);
        });

        contentEl.appendChild(stepsList);

        await this.loadVideo();
        const pluginPath = this.plugin.manifest.dir;
        if (!pluginPath) {
            return;
        }
        const videoPath = path.join(
            pluginPath,
            'assets',
            'user-guide-video.mp4'
        );

        try {
            const arrayBuffer =
                await this.app.vault.adapter.readBinary(videoPath);
            const buffer = Buffer.from(arrayBuffer);
            const base64 = buffer.toString('base64');
            const dataUrl = `data:video/mp4;base64,${base64}`;

            const videoEl = this.contentEl.createEl('video', {
                attr: {
                    controls: true,
                    src: dataUrl,
                },
            });
            videoEl.autoplay = false;
            videoEl.style.width = '100%';
            videoEl.style.maxHeight = '400px';
        } catch (error) {}

        const closeButton = contentEl.createEl('button', { text: 'Close' });
        closeButton.style.position = 'absolute';
        closeButton.style.right = '10px';
        closeButton.style.top = '10px';
        closeButton.addEventListener('click', () => this.close());
        contentEl.appendChild(closeButton);
    }

    onClose() {
        this.contentEl.empty();
    }

    async loadVideo() {
        const pluginDir = this.plugin.manifest.dir;
        if (!pluginDir) {
            return null;
        }
        const assetsPath = path.join(pluginDir, 'assets');
        const videoPath = path.join(assetsPath, 'user-guide-video.mp4');
        const existsAssetsPath =
            await this.app.vault.adapter.exists(assetsPath);
        if (!existsAssetsPath) {
            await this.app.vault.adapter.mkdir(assetsPath);
        }

        const isFirstPluginStart =
            await this.plugin.pluginStateChecker.isFirstPluginStart();
        if (isFirstPluginStart) {
            await this.downloadVideo(videoPath);
        } else {
            const exist = await this.app.vault.adapter.exists(videoPath);
            if (!exist) {
                await this.downloadVideo(videoPath);
            }
        }
    }

    async downloadVideo(videoPath: string) {
        try {
            const url =
                'https://raw.githubusercontent.com/gitcpy/mermaid-zoom-drag/main/assets/videos/find-class.mp4';

            const blob = await this.downloadFile(url);
            if (blob) {
                await this.app.vault.adapter.writeBinary(
                    videoPath,
                    await blob.arrayBuffer()
                );
                return true;
            }
            return null;
        } catch (err: any) {
            return null;
        }
    }

    private async downloadFile(url: string): Promise<Blob | null> {
        return new Promise((resolve, reject) => {
            https
                .get(new URL(url), (response) => {
                    if (response.statusCode !== 200) {
                        reject(
                            new Error(
                                `Failed to get '${url}' (${response.statusCode})`
                            )
                        );
                        return;
                    }

                    const chunks: Buffer[] = [];
                    response.on('data', (chunk) => chunks.push(chunk));
                    response.on('end', () => {
                        const buffer = Buffer.concat(chunks);
                        resolve(new Blob([buffer]));
                    });
                    response.on('error', reject);
                })
                .on('error', reject);
        });
    }
}
