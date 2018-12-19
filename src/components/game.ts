import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';
import { arcRotateCameraFixer } from '../libs/tencentTouchFixers';

export default class Game 
{
    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;
    private _camera: BABYLON.ArcRotateCamera;
    private _shadowGenerator: BABYLON.ShadowGenerator;
    private _assetsManager: BABYLON.AssetsManager;

    constructor(canvasElement: string) 
    {
        BABYLON.Engine.ShadersRepository = "src/shaders/";

        this._canvas = document.querySelector(canvasElement) as HTMLCanvasElement;
        this._engine = new BABYLON.Engine(this._canvas, true, {}, true);
        this._scene = new BABYLON.Scene(this._engine);
        this._scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this._scene.fogDensity = 0.05;
        this._scene.fogColor = new BABYLON.Color3(0.8, 0.83, 0.8);

        this.createBasicEnv();
    }

    createBasicEnv(): void 
    {
        let skybox = BABYLON.Mesh.CreateSphere("skyBox", 10, 2500, this._scene);

        let shader = new BABYLON.ShaderMaterial("gradient", this._scene, "gradient", {});
        shader.setFloat("offset", 0);
        shader.setFloat("exponent", 0.6);
        shader.setColor3("topColor", BABYLON.Color3.FromInts(0, 119, 255));
        shader.setColor3("bottomColor", BABYLON.Color3.FromInts(240, 240, 255));
        shader.backFaceCulling = false;
        skybox.material = shader;

        let d1 = new BABYLON.DirectionalLight("dir", new BABYLON.Vector3(1, -1, -2), this._scene);
        d1.position = new BABYLON.Vector3(-300, 300, 600);
        d1.intensity = 0.5;
        
        let h1 = new BABYLON.HemisphericLight("light", new BABYLON.Vector3(0, 1, 0), this._scene);
        h1.intensity = 1;

        this._shadowGenerator = new BABYLON.ShadowGenerator(2048, d1);

        this._camera = new BABYLON.ArcRotateCamera(
            'arcam',
            0,
            Math.PI / 2,
            5,
            new BABYLON.Vector3(0, 1, 0),
            this._scene
        );
        this._camera.upperBetaLimit = Math.PI / 2;
        this._camera.lowerRadiusLimit = 5;
        this._camera.upperRadiusLimit = 30;
        arcRotateCameraFixer(this._camera as BABYLON.ArcRotateCamera);
        this._camera.attachControl(this._canvas, false);

        this._assetsManager = new BABYLON.AssetsManager(this._scene);
        this._assetsManager.addTextureTask('snowflake', 'assets/textures/snowflake.png');
        this._assetsManager.addMeshTask('environment', '', 'assets/3d/christmas.glb', '');
        this._assetsManager.addMeshTask('alphabets', '', 'assets/3d/alphabets.glb', '');
        this._engine.loadingUIText = 'Loading...';
        this._assetsManager.onProgressObservable.add((task) => {
            const { remainingCount, totalCount } = task;
            this._engine.loadingUIText = 'We are loading the scene. ' + remainingCount + ' out of ' + totalCount + ' items still need to be loaded.';
        });

        this._assetsManager.onTaskSuccessObservable.add((task)=>{
            if(task.name == "environment")
                (task as BABYLON.MeshAssetTask).loadedMeshes.forEach((mesh)=>{
                    let shadowMap = this._shadowGenerator.getShadowMap();
                    shadowMap!.renderList!.push(mesh);
                    mesh.receiveShadows = true;
                });
            
            if(task.name == "snowflake")
                this.generateSnowParticles((task as BABYLON.TextureAssetTask).texture);
        });

        this._assetsManager.load();

        let ground = BABYLON.Mesh.CreateGround("ground", 200, 200, 1, this._scene);
        ground.material = new BABYLON.StandardMaterial("ground", this._scene);
        (ground.material as BABYLON.StandardMaterial).diffuseColor = BABYLON.Color3.FromInts(193, 181, 151);
        (ground.material as BABYLON.StandardMaterial).specularColor = BABYLON.Color3.Black();
        ground.receiveShadows = true;
    }

    generateSnowParticles(texture:BABYLON.Texture)
    {
        let particleSystem = new BABYLON.ParticleSystem("particles", 20000, this._scene);

        //Texture of each particle
        particleSystem.particleTexture = texture;

        // Where the particles come from
        particleSystem.emitter = new BABYLON.Vector3(0, 1, 0); // the starting object, the emitter
        particleSystem.minEmitBox = new BABYLON.Vector3(-10, 10, -10); // Starting all from
        particleSystem.maxEmitBox = new BABYLON.Vector3(15, 0, 10); // To...

        // Colors of all particles
        particleSystem.color1 = new BABYLON.Color4(1, 1, 1, 1.0);
        particleSystem.color2 = new BABYLON.Color4(1, 1, 1, 1.0);
        particleSystem.colorDead = new BABYLON.Color4(1, 1, 1, 0.5);

        // Size of each particle (random between...
        particleSystem.minSize = 0.1;
        particleSystem.maxSize = 0.2;

        // Life time of each particle (random between...
        particleSystem.minLifeTime = 0.3;
        particleSystem.maxLifeTime = 1.5;

        // Emission rate
        particleSystem.emitRate = 1500;

        // Blend mode : BLENDMODE_ONEONE, or BLENDMODE_STANDARD
        particleSystem.blendMode = BABYLON.ParticleSystem.BLENDMODE_STANDARD;

        // Set the gravity of all particles
        particleSystem.gravity = new BABYLON.Vector3(0, -9.81, 0);

        // Direction of each particle after it has been emitted
        particleSystem.direction1 = new BABYLON.Vector3(-7, -8, 3);
        particleSystem.direction2 = new BABYLON.Vector3(7, -8, -3);

        // Angular speed, in radians
        particleSystem.minAngularSpeed = 0;
        particleSystem.maxAngularSpeed = Math.PI;

        // Speed
        particleSystem.minEmitPower = 1;
        particleSystem.maxEmitPower = 3;
        particleSystem.updateSpeed = 0.0005;

        // Start the particle system
        particleSystem.start();
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