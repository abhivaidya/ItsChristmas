import * as BABYLON from 'babylonjs';
import { arcRotateCameraFixer } from '../libs/tencentTouchFixers';

export default class Game {

    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;
    private _camera: BABYLON.ArcRotateCamera;

    constructor(canvasElement: string) 
    {
        this._canvas = document.querySelector(canvasElement) as HTMLCanvasElement;
        this._engine = new BABYLON.Engine(this._canvas, true, {}, true);
        this._scene = new BABYLON.Scene(this._engine);

        this.createBasicEnv();
    }

    createBasicEnv(): void 
    {
        new BABYLON.HemisphericLight('hLight', new BABYLON.Vector3(-1, -1, -1), this._scene);
        const lightPos = new BABYLON.Vector3(5, 5, 5);
        const spotLight = new BABYLON.SpotLight('sLight', lightPos, new BABYLON.Vector3(0, -1, 0), Math.PI / 2, 20, this._scene);

        this._camera = new BABYLON.ArcRotateCamera(
            'arcam',
            0,
            Math.PI / 4,
            20,
            BABYLON.Vector3.Zero(),
            this._scene
        );
        this._camera.upperBetaLimit = Math.PI / 2;
        this._camera.lowerRadiusLimit = 5;
        this._camera.upperRadiusLimit = 30;
        arcRotateCameraFixer(this._camera as BABYLON.ArcRotateCamera);
        this._camera.attachControl(this._canvas, false);

        const assetsManager = new BABYLON.AssetsManager(this._scene);
        assetsManager.addTextureTask('ground-diffuse-texture', 'assets/textures/ground.jpg');
        assetsManager.addTextureTask('ground-heightMap-texture', 'assets/textures/heightMap.png');
        assetsManager.addBinaryFileTask('environment', 'assets/3d/christmas.glb');
        this._engine.loadingUIText = 'Loading...';
        assetsManager.onProgressObservable.add((task) => {
            const { remainingCount, totalCount } = task;
            this._engine.loadingUIText = 'We are loading the scene. ' + remainingCount + ' out of ' + totalCount + ' items still need to be loaded.';
        });

        assetsManager.onTaskSuccessObservable.add((task)=>{
            // if(task.name == "environment")
            //     this._scene.addMesh(task.data)
        });

        console.log(assetsManager);
        assetsManager.load();

    }

    doRender(): void 
    {
        this._engine.runRenderLoop(() => {
            this._scene.render();
        });

        window.addEventListener('resize', () => {
            this._engine.resize();
        })
    }

}