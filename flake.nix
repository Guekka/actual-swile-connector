{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-24.05";
    systems.url = "github:nix-systems/default";
    devenv.url = "github:cachix/devenv";
  };

  outputs = {
    self,
    nixpkgs,
    devenv,
    systems,
    ...
  } @ inputs: let
    forEachSystem = nixpkgs.lib.genAttrs (import systems);
  in {
    devShells =
      forEachSystem
      (system: let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        default = devenv.lib.mkShell {
          inherit inputs pkgs;
          modules = [
            {
              packages = with pkgs; [nodejs nodePackages_latest.pnpm gnumake gcc yarn];
              enterShell = ''
                export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
                export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
                export LD_LIBRARY_PATH=${pkgs.stdenv.cc.cc.lib}/lib64:$LD_LIBRARY_PATH
              '';
            }
          ];
        };
      });
  };
}
