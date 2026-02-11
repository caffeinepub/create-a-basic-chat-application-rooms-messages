import Principal "mo:core/Principal";
import Map "mo:core/Map";

module {
  // Old user profile format (only name)
  public type OldUserProfile = { name : Text };

  // Old actor type definition
  public type OldActor = {
    userProfiles : Map.Map<Principal, OldUserProfile>;
  };

  // New user profile with customization fields
  public type NewUserProfile = {
    name : Text;
    bio : Text;
    avatar : NewAvatarConfig;
  };

  // New avatar config type
  public type NewAvatarConfig = {
    avatarType : Text;
    color : Text;
    backgroundColor : Text;
    textOverlays : Text;
  };

  // New actor type definition
  public type NewActor = {
    userProfiles : Map.Map<Principal, NewUserProfile>;
    userPreferences : Map.Map<Principal, { theme : { #light; #dark; #systemDefault }; chatRefresh : { pollingIntervalMs : Nat } }>;
  };

  public func run(old : OldActor) : NewActor {
    let newUserProfiles = old.userProfiles.map<Principal, OldUserProfile, NewUserProfile>(
      func(_principal, oldProfile) {
        {
          name = oldProfile.name;
          bio = "";
          avatar = {
            avatarType = "default";
            color = "#333333";
            backgroundColor = "#CCCCCC";
            textOverlays = "";
          };
        };
      }
    );

    {
      userProfiles = newUserProfiles;
      userPreferences = Map.empty<Principal, { theme : { #light; #dark; #systemDefault }; chatRefresh : { pollingIntervalMs : Nat } }>();
    };
  };
};
