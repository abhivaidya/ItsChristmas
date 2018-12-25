import * as BABYLON from 'babylonjs';
import 'babylonjs-loaders';
import * as GUI from 'babylonjs-gui';
import { arcRotateCameraFixer } from '../libs/tencentTouchFixers';

export default class Game 
{
    private _canvas: HTMLCanvasElement;
    private _engine: BABYLON.Engine;
    private _scene: BABYLON.Scene;
    private _arcCamera: BABYLON.ArcRotateCamera;
    private _freeCamera: BABYLON.FreeCamera;
    private _shadowGenerator: BABYLON.ShadowGenerator;
    private _assetsManager: BABYLON.AssetsManager;

    private alphabetModels: {[key: string]: BABYLON.AbstractMesh} = {};

    public from: string|null = "";
    public to: string|null = "";

    private environment: BABYLON.Mesh;

    private santa: BABYLON.Mesh;
    private santaAnimGroups: {[key: string]: BABYLON.AnimationGroup} = {};

    // private keysDown: {[key: number]: boolean} = {};
    // private walkSpeed: number = 0.2;
    // private turnSpeed: number = 20.0;
    // private lastFrame: number = -1;

    private colors = ["5D5455", "EA4033", "E5A67B", "F2D6C1", "9DBC9D", "122521", "2D493A", "AA7153", "868080", "373938"];

    constructor(canvasElement: string) 
    {
        document.onkeydown = this.handleKeyDown.bind(this);
        document.onkeyup = this.handleKeyUp.bind(this);

        BABYLON.Engine.ShadersRepository = "src/shaders/";

        this._canvas = document.querySelector(canvasElement) as HTMLCanvasElement;
        this._engine = new BABYLON.Engine(this._canvas, true, {}, true);
        this._scene = new BABYLON.Scene(this._engine);
        this._scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
        this._scene.fogDensity = 0.05;
        this._scene.fogColor = new BABYLON.Color3(0.8, 0.83, 0.8);
        this._scene.collisionsEnabled = true;
        this._scene.gravity = new BABYLON.Vector3(0, 0, 0);

        this.createBasicEnv();
        this.createGUI();
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

        // this._arcCamera = new BABYLON.ArcRotateCamera(
        //     'arcam',
        //     0,
        //     Math.PI / 2,
        //     5,
        //     new BABYLON.Vector3(0, 1, 0),
        //     this._scene
        // );
        // this._arcCamera.upperBetaLimit = Math.PI / 2;
        // this._arcCamera.lowerRadiusLimit = 5;
        // this._arcCamera.upperRadiusLimit = 30;
        // arcRotateCameraFixer(this._arcCamera as BABYLON.ArcRotateCamera);
        // this._arcCamera.attachControl(this._canvas, false);

        this._freeCamera = new BABYLON.FreeCamera("camera1", new BABYLON.Vector3(-3.12, 1.3, 3.5), this._scene);
        this._freeCamera.setTarget(new BABYLON.Vector3(0, 1, 0));

        this._assetsManager = new BABYLON.AssetsManager(this._scene);
        this._assetsManager.addTextureTask('snowflake', 'assets/textures/snowflake.png');
        this._assetsManager.addMeshTask('environment', '', 'assets/3d/christmas.glb', '');
        this._assetsManager.addMeshTask('alphabets', '', 'assets/3d/alphabets.glb', '');
        this._assetsManager.addMeshTask('santa', '', 'assets/3d/santa_with_anims_textures.glb', '');
        this._engine.loadingUIText = 'Loading...';
        this._assetsManager.onProgressObservable.add((task) => {
            const { remainingCount, totalCount } = task;
            this._engine.loadingUIText = 'Loading the scene. ' + remainingCount + ' out of ' + totalCount + ' items still need to be loaded.';
        });

        this._assetsManager.onTaskSuccessObservable.add((task)=>{
            if(task.name == "environment")
            {
                this.environment = new BABYLON.Mesh("environment", this._scene);

                (task as BABYLON.MeshAssetTask).loadedMeshes.forEach((mesh)=>{
                    this.environment.addChild(mesh);

                    let shadowMap = this._shadowGenerator.getShadowMap();
                    shadowMap!.renderList!.push(mesh);
                    mesh.receiveShadows = true;
                });

                // this.environment.rotation.y = this.degToRad(250);
            }

            if(task.name == "snowflake")
            {
                this.generateSnowParticles((task as BABYLON.TextureAssetTask).texture);
            }

            if(task.name == "alphabets")
            {
                (task as BABYLON.MeshAssetTask).loadedMeshes.forEach((mesh)=>{
                    this.alphabetModels[mesh.name] = mesh;
                    mesh.setEnabled(false);
                });
                
                // this.generateFromTo();
            }

            if(task.name == "santa")
            {
                this.santa = new BABYLON.Mesh("santa", this._scene);

                let santaSkeleton: BABYLON.Nullable<BABYLON.Skeleton> = (task as BABYLON.MeshAssetTask).loadedSkeletons[0];
                if(santaSkeleton)
                {
                    santaSkeleton.animationPropertiesOverride = new BABYLON.AnimationPropertiesOverride();
                    santaSkeleton.animationPropertiesOverride.enableBlending = true;
                    santaSkeleton.animationPropertiesOverride.blendingSpeed = 0.05;
                    santaSkeleton.animationPropertiesOverride.loopMode = 1;
                }

                santaSkeleton.getScene().animationGroups.forEach((animationGroup) => {
                    this.santaAnimGroups[animationGroup.name] = animationGroup;
                });

                (task as BABYLON.MeshAssetTask).loadedMeshes.forEach((mesh)=>{
                    this.santa.addChild(mesh);
                });

                this.santa.scaling = new BABYLON.Vector3(0.075, 0.075, 0.075);
                this.santa.rotation.y = this.degToRad(-20);
                this.santa.position.x = -1;
                this.santa.position.z = 1;

                // this.santaCollider = BABYLON.Mesh.CreateBox("collider", 0.5, this._scene);
                // this.santaCollider.position = new BABYLON.Vector3(0, 0.25, 0);
                // this.santaCollider.scaling = new BABYLON.Vector3(0.5, 1, 0.5);
                // this.santaCollider.visibility = 0;
                // (this.santaCollider.material as BABYLON.StandardMaterial).alpha = 0;
                // this.santa.addChild(this.santaCollider);

                let shadowMap = this._shadowGenerator.getShadowMap();
                shadowMap!.renderList!.push(this.santa);
                // this.santa.receiveShadows = true;
            }
        });

        this._assetsManager.onTasksDoneObservable.add(()=>{
            this.generateFromTo();
        });
        
        this._assetsManager.load();

        let ground = BABYLON.Mesh.CreateGround("ground", 200, 200, 1, this._scene);
        ground.material = new BABYLON.StandardMaterial("ground", this._scene);
        (ground.material as BABYLON.StandardMaterial).diffuseColor = BABYLON.Color3.FromInts(193, 181, 151);
        (ground.material as BABYLON.StandardMaterial).specularColor = BABYLON.Color3.Black();
        ground.receiveShadows = true;

        let music = new BABYLON.Sound("Jingle Bells", "assets/sounds/jingle_bells.mp3", this._scene, null, { loop: true, autoplay: true });
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

            let current = new Date().getTime();

            /*if (this.lastFrame == -1) {
                this.lastFrame = current;
            }

            let elapsed = (current - this.lastFrame) / 1000.0;
            this.lastFrame = current;

            let yRot = 0;
            let walkSpeed = 0;

            if(this.keysDown[65]) 
                yRot -= elapsed * this.turnSpeed;
            else if(this.keysDown[68]) 
                yRot += elapsed * this.turnSpeed;            

            if(this.keysDown[87]) 
                walkSpeed = this.walkSpeed;
            else if(this.keysDown[83])
                walkSpeed = -this.walkSpeed;

            if(this.santa)
            {
                this.planOBB.forEach((mesh) => {
                    if(mesh.intersectsMesh(this.santaCollider, true))                    
                    {
                        walkSpeed = 0;
                    }
                });

                this.santa.translate(BABYLON.Axis.Z, walkSpeed, BABYLON.Space.LOCAL);
                this.santa.rotate(BABYLON.Axis.Y, yRot/10, BABYLON.Space.WORLD);
            }

            this.presents.update();*/
        });

        window.addEventListener('resize', () => {
            this._engine.resize();
        })
    }

    generateFromTo()
    {
        let from = "";
        let to = "";

        let fromNameMesh: BABYLON.AbstractMesh = new BABYLON.AbstractMesh("fromNameMesh", this._scene);
        fromNameMesh.rotation.y = this.degToRad(135);

        let toNameMesh: BABYLON.AbstractMesh = new BABYLON.AbstractMesh("toNameMesh", this._scene);
        toNameMesh.rotation.y = this.degToRad(135);  
        
        if(this.from != null)
            from = this.from;
        
        if(this.to != null)
            to = this.to;
        
        let shadowMap = this._shadowGenerator.getShadowMap();
        
        for(let i = 0; i < from.length; i++)
        {
            let alphabet: BABYLON.Nullable<BABYLON.AbstractMesh> = this.alphabetModels[from[i]].clone(from[i], fromNameMesh, true);
            fromNameMesh.addChild(alphabet as BABYLON.AbstractMesh);
            alphabet!.material = new BABYLON.StandardMaterial(from[i] + "Mat", this._scene);

            if(alphabet)
            {
                alphabet.position.x = i * 0.2;
                // alphabet.position.y = 0.25;
                alphabet.rotation.x = Math.PI / 2;

                shadowMap!.renderList!.push(alphabet);

                (alphabet.material as BABYLON.StandardMaterial).emissiveColor = this.HexToRGB(this.colors[Math.floor(this.colors.length * Math.random())]);
            }
        }
        
        fromNameMesh.position = new BABYLON.Vector3(this.santa.position.x - 0.5, 0.25, this.santa.position.z);

        for(let i = to.length - 1; i >= 0; i--)
        {
            let alphabet: BABYLON.Nullable<BABYLON.AbstractMesh> = this.alphabetModels[to[i]].clone(to[i], toNameMesh, true);
            alphabet!.material = new BABYLON.StandardMaterial(to[i] + "Mat", this._scene);

            if(alphabet)
            {
                alphabet.position.x = i * 0.2;
                // alphabet.position.y = 0.25;
                alphabet.rotation.x = this.degToRad(90);

                shadowMap!.renderList!.push(alphabet);

                (alphabet.material as BABYLON.StandardMaterial).emissiveColor = this.HexToRGB(this.colors[Math.floor(this.colors.length * Math.random())]);
            }
        }
        
        toNameMesh.position = new BABYLON.Vector3(this.santa.position.x - 0.5, 0.2, this.santa.position.z);
        // toNameMesh.rotation = new BABYLON.Vector3(0 , Math.PI, 0);
    }

    private handleKeyDown(event: KeyboardEvent) 
    {
        // this.keysDown[event.keyCode] = true;

        // if(this.keysDown[87] || this.keysDown[83] )
        // {
        //     if(!this.santaAnimGroups["Happy Walk"].isPlaying)
        //     {            
        //         this.santaAnimGroups["Happy"].stop();
        //         this.santaAnimGroups["Happy Walk"].play(true);
        //     }
        // }
    }
    
    private handleKeyUp(event: KeyboardEvent) 
    {
        // this.keysDown[event.keyCode] = false;

        // if(!this.keysDown[87] && !this.keysDown[83])
        // {
        //     if(!this.santaAnimGroups["Happy"].isPlaying)
        //     {            
        //         this.santaAnimGroups["Happy Walk"].stop();
        //         this.santaAnimGroups["Happy"].play(true);
        //     }
        // }
    }
    
    private degToRad(degrees: number) 
    {
        return degrees * Math.PI / 180;
    }

    private HexToRGB(hex: string): BABYLON.Color3 
    {
        var r = this.HexToR(hex) / 255;
        var g = this.HexToG(hex) / 255;
        var b = this.HexToB(hex) / 255;

        return new BABYLON.Color3(r, g, b);
    }
    
    CutHex(h) { return (h.charAt(0) == "#") ? h.substring(1, 7) : h }
    HexToR(h) { return parseInt((this.CutHex(h)).substring(0, 2), 16) }
    HexToG(h) { return parseInt((this.CutHex(h)).substring(2, 4), 16) }
    HexToB(h) { return parseInt((this.CutHex(h)).substring(4, 6), 16) }

    private createGUI()
    {
        let advancedTexture = GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");
        
        let image = new GUI.Image("but", "assets/textures/Merry_Christmas.png");
        image.width = 0.25;
        image.height = 0.2;
        // image.horizontalAlignment = GUI.Control.HORIZONTAL_ALIGNMENT_CENTER;
        image.verticalAlignment = GUI.Control.VERTICAL_ALIGNMENT_TOP; 
        advancedTexture.addControl(image);
    }
}