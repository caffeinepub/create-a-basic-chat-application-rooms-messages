import Map "mo:core/Map";
import Principal "mo:core/Principal";
import Storage "blob-storage/Storage";
import Set "mo:core/Set";

module {
  type OldUserProfile = {
    name : Text;
    bio : Text;
    avatarType : Text;
    color : Text;
    backgroundColor : Text;
    textOverlays : Text;
    profilePicture : ?Storage.ExternalBlob;
    profileFlag : ?Text;
  };

  type OldActor = {
    userProfiles : Map.Map<Principal, OldUserProfile>;
    allowedFlags : Set.Set<Text>;
  };

  type NewUserProfile = {
    name : Text;
    bio : Text;
    avatarType : Text;
    color : Text;
    backgroundColor : Text;
    textOverlays : Text;
    profilePicture : ?Storage.ExternalBlob;
  };

  type NewActor = {
    userProfiles : Map.Map<Principal, NewUserProfile>;
  };

  public func run(old : OldActor) : NewActor {
    let newUserProfiles = old.userProfiles.map<Principal, OldUserProfile, NewUserProfile>(
      func(_principal, oldProfile) {
        {
          name = oldProfile.name;
          bio = oldProfile.bio;
          avatarType = oldProfile.avatarType;
          color = oldProfile.color;
          backgroundColor = oldProfile.backgroundColor;
          textOverlays = oldProfile.textOverlays;
          profilePicture = oldProfile.profilePicture;
        };
      }
    );
    { userProfiles = newUserProfiles };
  };
};
